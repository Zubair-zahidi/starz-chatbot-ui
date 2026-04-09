import type { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

export type FocusArea =
  | 'exoplanets'
  | 'blackholes'
  | 'galaxies'
  | 'stars'
  | 'nebulae'
  | 'cosmology'
  | 'solar-system'
  | 'missions'
  | 'astrophotography'
  | 'astronomy-basics';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

export interface ChatContext {
  astronomicalFocus: FocusArea[];
  lastQuery: string;
  expertiseLevel: ExpertiseLevel;
  temperature?: number;
  maxTokens?: number;
  previousContext?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export interface IMessageMetadata {
  responseTime?: number;
  tokensUsed: number;
  model: string;
  temperature?: number;
  sources?: string[];
  confidence?: number;
  images?: string[];
}

export interface IMessage {
  sessionId: ObjectId;
  content: string;
  encrypted?: boolean;
  contentIv?: string;
  contentAuthTag?: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata: IMessageMetadata;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;
  version: number;
}

export interface IChatSession {
  userId?: ObjectId;
  guestId?: string;
  title: string;
  messages: ObjectId[];
  context: {
    astronomicalFocus: FocusArea[];
    lastQuery: string;
    expertiseLevel: ExpertiseLevel;
    temperature: number;
    maxTokens: number;
    summary?: string;
  };
  metadata: {
    messageCount: number;
    totalTokens: number;
    lastActivity: Date;
    isArchived: boolean;
    isPinned: boolean;
    tags: string[];
  };
  isPrivate: boolean;
  sharedWith?: Array<{
    user: ObjectId;
    permission: 'read' | 'write' | 'admin';
  }>;
}

export type IChatSessionWithMessages = Omit<IChatSession, 'messages'> & {
  _id?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  messages: IMessage[];
};

export interface SessionCreateDTO {
  title?: string;
  focusAreas?: FocusArea[];
  expertiseLevel?: ExpertiseLevel;
  temperature?: number;
  maxTokens?: number;
  tags?: string[];
}

export interface SessionUpdateDTO {
  title?: string;
  focusAreas?: FocusArea[];
  expertiseLevel?: ExpertiseLevel;
  temperature?: number;
  maxTokens?: number;
  tags?: string[];
  isArchived?: boolean;
  isPinned?: boolean;
}

export interface MessageCreateDTO {
  content: string;
  model?: string;
  stream?: boolean;
  images?: string[];
}

export interface ChatResponse {
  content: string;
  metadata: {
    model: string;
    tokensUsed: number;
    responseTime: number;
    done?: boolean;
    context?: number[];
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
  model: string;
  tokensUsed: number;
  responseTime: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    num_ctx?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    stop?: string[];
  };
  context?: number[];
  images?: string[];
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    num_ctx?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    stop?: string[];
  };
  images?: string[];
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message?: {
    role: 'assistant' | 'user' | 'system';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
