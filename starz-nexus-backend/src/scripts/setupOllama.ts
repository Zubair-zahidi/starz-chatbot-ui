import { ollamaService } from '../services/ollama.service';
import { logger } from '../utils/logger';

const setupOllama = async () => {
  try {
    logger.info('Setting up Ollama...');
    
    // Check connection
    const isConnected = await ollamaService.checkConnection();
    if (!isConnected) {
      logger.error('Cannot connect to Ollama. Make sure Ollama is running.');
      process.exit(1);
    }
    
    // List available models
    const models = await ollamaService.listModels();
    logger.info(`Available models: ${models.map(m => m.name).join(', ')}`);
    
    const requiredModels: Array<{ name: string; aliases: string[] }> = [
      { name: 'llama3.1', aliases: ['llama3.1', 'llama3'] },
      { name: 'dolphin3.1', aliases: ['dolphin3.1', 'dolphin3', 'dolphin-3.1'] },
    ];
    
    for (const { name, aliases } of requiredModels) {
      const hasModel = models.some((m) => aliases.some((alias) => String(m.name).toLowerCase().includes(alias.toLowerCase())));
      
      if (!hasModel) {
        logger.info(`${name} not found. Attempting to pull...`);
        try {
          await ollamaService.pullModel(name);
          logger.info(`✅ ${name} pulled successfully`);
        } catch (error) {
          logger.error(`Failed to pull ${name}:`, error);
          logger.info(`You can manually pull with: ollama pull ${name}`);
        }
      } else {
        logger.info(`✅ ${name} is already available`);
      }
    }
    
    // Get model info for default model
    try {
      const modelInfo = await ollamaService.getModelInfo('llama3.1');
      logger.info(`Model info for llama3.1: ${JSON.stringify(modelInfo, null, 2)}`);
    } catch (error) {
      logger.warn('Could not get model info:', error);
    }
    
    logger.info('✅ Ollama setup completed');
    process.exit(0);
    
  } catch (error) {
    logger.error('Ollama setup failed:', error);
    process.exit(1);
  }
};

setupOllama();