import { BaseModelProvider, ChatMessage, ModelProviderOptions, ModelResponse, StreamChunkCallback } from './base-provider';
import { env } from '../../env';

// Extended options for Perplexity
export interface PerplexityOptions extends ModelProviderOptions {
  appName?: string;
  appUrl?: string;
  providerRouting?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: 'allow' | 'deny';
    ignore?: string[];
    quantizations?: string[];
    sort?: 'price' | 'throughput' | 'latency';
  };
}

export class PerplexityProvider extends BaseModelProvider {
  private apiKey: string;
  private baseUrl: string;
  private appName: string;
  private appUrl: string;
  private providerRouting?: PerplexityOptions['providerRouting'];
  
  constructor(options: PerplexityOptions) {
    super(options);
    
    // Get environment variables or use defaults
    this.apiKey = options.apiKey || env.PERPLEXITY_API_KEY;
    this.baseUrl = options.baseUrl || env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai/chat/completions';
    this.appName = options.appName || env.APP_NAME || 'Advanced Research App';
    this.appUrl = options.appUrl || env.APP_URL || 'https://example.com';
    this.providerRouting = options.providerRouting;
    
    if (!env.IS_BUILD_TIME && !this.apiKey) {
      console.warn('WARNING: Perplexity API key not found. Set NEXT_SERVER_PERPLEXITY_API_KEY in your .env.local file.');
    }
  }
  
  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        console.error('ERROR: No Perplexity API key found.');
        throw new Error('Perplexity API key is not set');
      }
      
      // Add request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': this.appUrl,
            'X-Title': this.appName
          },
          body: JSON.stringify({
            model: this.options.modelId,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            temperature: this.options.temperature || 0.7,
            max_tokens: this.options.maxTokens || 1000,
            provider: this.providerRouting,
            ...this.options
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Perplexity API error:', response.status, errorText);
          throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
        }
  
        const data = await response.json();
        
        // Extract response from model
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
          throw new Error('Invalid response from Perplexity');
        }
        
        const choice = data.choices[0];
        
        if (!choice || !choice.message || !choice.message.content) {
          throw new Error('Missing content in Perplexity response');
        }
        
        return {
          content: choice.message.content,
          metadata: {
            model: data.model || this.options.modelId,
            usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            raw: data
          }
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error in Perplexity provider:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Perplexity request timed out after 60 seconds');
      }
      throw error;
    }
  }

  async streamChat(messages: ChatMessage[], callback: StreamChunkCallback): Promise<ModelResponse> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        console.error('ERROR: No Perplexity API key found.');
        throw new Error('Perplexity API key is not set');
      }
      
      // Add request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout for streaming

      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': this.appUrl,
            'X-Title': this.appName
          },
          body: JSON.stringify({
            model: this.options.modelId,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            temperature: this.options.temperature || 0.7,
            max_tokens: this.options.maxTokens || 4000,
            stream: true, // Enable streaming
            provider: this.providerRouting,
            ...this.options
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Perplexity API streaming error:', response.status, errorText);
          throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
        }

        // Process the streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let model = '';
        let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        
        if (!reader) {
          throw new Error('Failed to get reader from stream');
        }
        
        // Read the stream data
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk value
          const chunk = decoder.decode(value, { stream: true });
          
          // Process each SSE line
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            // Skip non-data lines
            if (!line.startsWith('data: ')) continue;
            
            // Extract the data portion
            const data = line.substring(6);
            
            // Handle end of stream marker
            if (data === '[DONE]') continue;
            
            try {
              // Parse JSON data
              const parsedData = JSON.parse(data);
              
              // Extract the delta content if available
              if (parsedData.choices && parsedData.choices[0]?.delta?.content) {
                const contentChunk = parsedData.choices[0].delta.content;
                fullContent += contentChunk;
                
                // Update model info if available
                if (parsedData.model && !model) {
                  model = parsedData.model;
                }
                
                // Update usage info if available
                if (parsedData.usage) {
                  usage = parsedData.usage;
                }
                
                // Invoke the callback with the content chunk
                if (callback) {
                  callback(contentChunk);
                }
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
              continue; // Continue processing other chunks
            }
          }
        }
        
        // Return the final response
        return {
          content: fullContent,
          metadata: {
            model: model || this.options.modelId,
            usage,
            raw: { model, usage }
          }
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error in Perplexity provider streaming:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Perplexity streaming request timed out after 3 minutes');
      }
      throw error;
    }
  }
}

// Factory function to create providers for specific models
export function createModelProvider(modelId: string, options: Partial<PerplexityOptions> = {}): PerplexityProvider {
  // Set up Groq as the preferred provider for DeepSeek R1 Distill model
  let providerRouting = options.providerRouting;
  
  if (modelId === 'deepseek/deepseek-r1-distill-llama-70b') {
    providerRouting = {
      order: ['Groq'],
      allow_fallbacks: false,
      ...providerRouting  // Preserve any user-specified routing options
    };
  }
  
  return new PerplexityProvider({
    modelId,
    providerRouting,
    ...options
  });
} 