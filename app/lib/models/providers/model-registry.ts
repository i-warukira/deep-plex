import { BaseModelProvider } from './base-provider';
import { PerplexityProvider, createModelProvider } from './perplexity-provider';

// Type for model configuration
export interface ModelConfig {
  id: string;          // Full model ID with provider prefix (e.g., 'deepseek/deepseek-r1:free')
  key: string;         // Short key for referencing the model (e.g., 'deepseek-r1')
  name: string;        // Display name (e.g., 'DeepSeek R1')
  description: string;
  provider: string;    // Provider name (e.g., 'deepseek', 'anthropic')
  contextLength: number;
  capabilities: string[];
  defaultTemperature: number;
  defaultMaxTokens: number;
}

// Available models with their configurations
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'claude-3.7-sonnet': {
    id: 'anthropic/claude-3.7-sonnet',
    key: 'claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    description: 'Fast model with 200K context window, excellent for reasoning.',
    provider: 'anthropic',
    contextLength: 200000,
    capabilities: ['reasoning', 'analysis', 'streaming', 'research'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'deepseek-r1': {
    id: 'deepseek/deepseek-r1:free',
    key: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: 'Open-source model with strong reasoning capabilities.',
    provider: 'deepseek',
    contextLength: 128000,
    capabilities: ['reasoning', 'math', 'coding'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'gpt-4o': {
    id: 'openai/gpt-4o',
    key: 'gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI\'s multimodal model with strong reasoning and coding abilities.',
    provider: 'openai',
    contextLength: 128000,
    capabilities: ['reasoning', 'coding', 'analysis'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'claude-3-sonnet': {
    id: 'anthropic/claude-3-sonnet',
    key: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced model with strong reasoning capabilities.',
    provider: 'anthropic',
    contextLength: 200000,
    capabilities: ['reasoning', 'analysis', 'research'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'llama-3-70b-instruct': {
    id: 'meta/llama-3-70b-instruct',
    key: 'llama-3-70b-instruct',
    name: 'Llama-3-70B-Instruct',
    description: 'Meta\'s open-source large language model.',
    provider: 'meta',
    contextLength: 8192,
    capabilities: ['reasoning', 'instruction-following'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  // Add the new Perplexity models
  'sonar-deep-research': {
    id: 'sonar-deep-research',
    key: 'sonar-deep-research',
    name: 'Sonar Deep Research',
    description: 'Specialized research model with 128K context window.',
    provider: 'perplexity',
    contextLength: 128000,
    capabilities: ['research', 'analysis', 'reasoning'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'sonar-reasoning-pro': {
    id: 'sonar-reasoning-pro',
    key: 'sonar-reasoning-pro',
    name: 'Sonar Reasoning Pro',
    description: 'Enhanced reasoning model with 128K context window.',
    provider: 'perplexity',
    contextLength: 128000,
    capabilities: ['reasoning', 'analysis', 'research'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'llama-3.1-sonar-large-128k-online': {
    id: 'llama-3.1-sonar-large-128k-online',
    key: 'llama-3.1-sonar-large-128k-online',
    name: 'llama-3.1-sonar-large-128k-online',
    description: 'Reasoning model by Perplexity with 128K context window.',
    provider: 'perplexity',
    contextLength: 128000,
    capabilities: ['reasoning', 'research'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'sonar-pro': {
    id: 'sonar-pro',
    key: 'sonar-pro',
    name: 'Sonar Pro',
    description: 'Premium Perplexity model with 200K context window.',
    provider: 'perplexity',
    contextLength: 200000,
    capabilities: ['reasoning', 'analysis', 'research'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'sonar': {
    id: 'sonar',
    key: 'sonar',
    name: 'Sonar',
    description: 'Standard Perplexity model with 128K context window.',
    provider: 'perplexity',
    contextLength: 128000,
    capabilities: ['reasoning', 'analysis'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  // Keep other existing models
  'deepseek-distill-70b': {
    id: 'deepseek/deepseek-r1-distill-llama-70b',
    key: 'deepseek-distill-70b',
    name: 'DeepSeek R1 Distill 70B',
    description: 'Fast Llama-3 model distilled with DeepSeek R1.',
    provider: 'groq',
    contextLength: 131072,
    capabilities: ['reasoning', 'research', 'fast-inference'],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },
  'gemini-flash': {
    id: 'google/gemini-2.0-flash-001',
    key: 'gemini-flash',
    name: 'Gemini Flash 2.0',
    description: 'Google model with 1M context window, great for large texts.',
    provider: 'google',
    contextLength: 1000000, // 1M tokens
    capabilities: ['reasoning', 'processing', 'summarization'],
    defaultTemperature: 0.3, // Lower temperature for more focused processing
    defaultMaxTokens: 4000,
  }
};

// Model Registry to manage all model providers
export class ModelRegistry {
  private static instance: ModelRegistry;
  private providers: Map<string, BaseModelProvider> = new Map();
  
  private constructor() {
    // Singleton instance
  }
  
  // Get the singleton instance
  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }
  
  // Get all available model configs
  public getAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS);
  }
  
  // Get a specific model config
  public getModelConfig(modelKey: string): ModelConfig | undefined {
    return MODEL_CONFIGS[modelKey];
  }

  // Get the model ID from a model key
  public getModelId(modelKey: string): string | undefined {
    const config = this.getModelConfig(modelKey);
    return config?.id;
  }
  
  // Get or create a provider for a specific model
  public getProvider(modelKey: string, options: any = {}): BaseModelProvider {
    // Use claude-3.7-sonnet if modelKey is undefined or invalid
    if (!modelKey || !MODEL_CONFIGS[modelKey]) {
      console.log(`Using default model claude-3.7-sonnet instead of ${modelKey || 'undefined'}`);
      modelKey = 'claude-3.7-sonnet';
    }
    
    // Check if we already have this provider instance
    const providerKey = `${modelKey}-${JSON.stringify(options)}`;
    
    if (this.providers.has(providerKey)) {
      return this.providers.get(providerKey)!;
    }
    
    // Get the model configuration
    const modelConfig = this.getModelConfig(modelKey);
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelKey}`);
    }
    
    // Create a new provider based on the model configuration
    const provider = createModelProvider(modelConfig.id, {
      temperature: options.temperature || modelConfig.defaultTemperature,
      maxTokens: options.maxTokens || modelConfig.defaultMaxTokens,
      ...options
    });
    
    // Store the provider for reuse
    this.providers.set(providerKey, provider);
    
    return provider;
  }
  
  // Clear all providers (useful for testing or when changing API keys)
  public clearProviders(): void {
    this.providers.clear();
  }
} 
