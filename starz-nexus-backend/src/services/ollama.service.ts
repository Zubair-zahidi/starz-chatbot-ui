import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';
import { 
  ChatResponse, 
  StreamChunk, 
  ChatContext,
  OllamaResponse,
  OllamaGenerateRequest
} from '../types/chat.types';

export class OllamaService extends EventEmitter {
  private client: AxiosInstance;
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    this.client = axios.create({
      baseURL: config.OLLAMA_URL,
      timeout: config.OLLAMA_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Start connection monitoring
    this.checkConnection();
    this.connectionCheckInterval = setInterval(() => this.checkConnection(), 60000);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  }

  /**
   * Resolve requested model to an available Ollama model alias.
   */
  private async resolveModelName(requestedModel?: string): Promise<string> {
    const requested = (requestedModel?.trim() || config.OLLAMA_MODEL || 'llama3').toLowerCase();
    const aliasMap: Record<string, string[]> = {
      'llama3.1': ['llama3.1:latest', 'llama3.1', 'llama3:latest', 'llama3'],
      'llama3': ['llama3:latest', 'llama3', 'llama3.1:latest', 'llama3.1'],
      'dolphin3.1': ['dolphin3:latest', 'dolphin3:8b', 'dolphin3.1', 'dolphin3'],
      'dolphin3': ['dolphin3:latest', 'dolphin3:8b', 'dolphin3', 'dolphin3.1'],
    };

    try {
      const availableModels = await this.listModels();
      const knownNames = availableModels
        .map((model: any) => String(model.name).toLowerCase())
        .filter(Boolean);

      const candidates = aliasMap[requested] || [requested];
      for (const candidate of candidates) {
        if (knownNames.includes(candidate.toLowerCase())) {
          return candidate;
        }
      }
    } catch {
      // If model listing fails, continue with requested model.
    }

    return requestedModel?.trim() || config.OLLAMA_MODEL || 'llama3';
  }

  /**
   * Check Ollama connection
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.client.get('/');
      
      if (!this.isConnected) {
        this.isConnected = true;
        this.retryCount = 0;
        this.emit('connected');
        logger.info('✅ Ollama connected successfully');
      }
      
      return true;
    } catch (error) {
      if (this.isConnected) {
        this.isConnected = false;
        this.emit('disconnected');
        logger.warn('⚠️ Ollama connection lost');
      }
      
      return false;
    }
  }

  /**
   * Generate response from Ollama
   */
  async generateResponse(
    prompt: string,
    context: ChatContext,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<ChatResponse | AsyncIterable<StreamChunk>> {
    if (!this.isConnected) {
      throw new ApiError('Ollama service is not connected', 503, 'OLLAMA_DISCONNECTED');
    }

    const model = await this.resolveModelName(options.model);
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 1000;
    const stream = options.stream ?? false;

    const formattedPrompt = this.formatAstronomicalPrompt(prompt, context);

    const payload: OllamaGenerateRequest = {
      model,
      prompt: formattedPrompt,
      stream,
      options: {
        temperature,
        num_predict: maxTokens,
        // Higher-quality defaults (balanced, less repetitive, better reasoning)
        top_p: 0.95,
        top_k: 60,
        repeat_penalty: 1.08,
        // Avoid overly-aggressive stops like "\n\n" which can truncate answers immediately.
        stop: ['User:', 'Assistant:', 'Human:'],
      },
      context: context.previousContext ? [] : undefined, // Placeholder for context
    };

    try {
      if (stream) {
        return this.streamResponse(payload);
      }

      const startTime = Date.now();
      const response = await this.client.post<OllamaResponse>('/api/generate', payload);
      const responseTime = Date.now() - startTime;

      const tokensUsed = this.estimateTokens(response.data.response);

      logger.debug(`Generated response in ${responseTime}ms with ${tokensUsed} tokens`);

      return {
        content: response.data.response,
        metadata: {
          model,
          tokensUsed,
          responseTime,
          done: response.data.done,
          context: response.data.context,
        },
      };
    } catch (error: any) {
      logger.error('Ollama API error:', error);
      
      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying Ollama request (attempt ${this.retryCount})...`);
        await this.delay(1000 * this.retryCount); // Exponential backoff
        return this.generateResponse(prompt, context, options);
      }

      throw new ApiError(
        error.response?.data?.error || 'Failed to generate response from AI service',
        error.response?.status || 500,
        'OLLAMA_ERROR'
      );
    }
  }

  /**
   * Stream response from Ollama
   */
  private async *streamResponse(payload: OllamaGenerateRequest): AsyncIterable<StreamChunk> {
    try {
      const response = await this.client.post('/api/generate', payload, {
        responseType: 'stream',
        timeout: 120000, // 2 minutes for streaming
      });

      let fullResponse = '';
      let tokens = 0;
      const startTime = Date.now();

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.response) {
              fullResponse += data.response;
              tokens += this.estimateTokens(data.response);
              
              yield {
                content: data.response,
                done: data.done,
                model: payload.model,
                tokensUsed: tokens,
                responseTime: Date.now() - startTime,
              };
            }
            
            if (data.done) {
              logger.debug(`Stream completed: ${tokens} tokens in ${Date.now() - startTime}ms`);
              return;
            }
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    } catch (error: any) {
      logger.error('Ollama stream error:', error);
      throw new ApiError(
        'Failed to stream response from AI service',
        error.response?.status || 500,
        'OLLAMA_STREAM_ERROR'
      );
    }
  }

  /**
   * Format prompt for astronomical context
   */
  private formatAstronomicalPrompt(prompt: string, context: ChatContext): string {
    const style = {
      beginner:
        'Be clear and friendly. Define jargon. Use small steps and simple examples. Avoid heavy math unless asked.',
      intermediate:
        'Be precise. Explain key terms briefly. Use examples. Add formulas only when useful.',
      expert:
        'Be rigorous and concise. State assumptions. Include edge cases and complexity when relevant.',
    }[context.expertiseLevel];

    const memory = context.previousContext?.length
      ? `Context (most recent last):\n` +
        context.previousContext
          .map((m) => `${String(m.role).toUpperCase()}: ${String(m.content)}`)
          .join('\n')
      : '';

    // General-purpose assistant prompt (ChatGPT-like), still tuned for high-quality technical output.
    return (
      `You are STARZ, a professional AI assistant.\n` +
      `Developer: Zubair Zahidi.\n\n` +
      `Behavior:\n` +
      `- Answer any topic (coding, math, science, writing, debugging, product questions).\n` +
      `- Prefer correct, practical answers. If uncertain, say so and ask 1-2 clarifying questions.\n` +
      `- For coding: provide working code, explain briefly, and include edge cases.\n` +
      `- Use markdown formatting when it improves readability.\n\n` +
      `Audience level: ${context.expertiseLevel}. ${style}\n\n` +
      (memory ? `${memory}\n\n` : '') +
      `User: ${prompt}\n` +
      `Assistant:`
    );
  }

  /**
   * List available models
   */
  async listModels(): Promise<Array<{ name: string; size: number; modified: string; details: any }>> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models || [];
    } catch (error) {
      logger.error('Failed to list models:', error);
      return [];
    }
  }

  /**
   * Pull a model
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      await this.client.post('/api/pull', { 
        name: modelName, 
        stream: false 
      });
      logger.info(`Model ${modelName} pulled successfully`);
    } catch (error) {
      logger.error(`Failed to pull model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      await this.client.delete('/api/delete', { 
        data: { name: modelName } 
      });
      logger.info(`Model ${modelName} deleted successfully`);
    } catch (error) {
      logger.error(`Failed to delete model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await this.client.post('/api/show', { 
        name: modelName 
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to get model info for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 4 characters ≈ 1 token for English text
    // This is approximate; actual tokenization depends on the model
    return Math.ceil(text.length / 4);
  }

  /**
   * Helper: Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      baseUrl: config.OLLAMA_URL,
      defaultModel: config.OLLAMA_MODEL,
      retryCount: this.retryCount,
      uptime: this.isConnected ? 'connected' : 'disconnected',
    };
  }
}

// Singleton instance
export const ollamaService = new OllamaService();
