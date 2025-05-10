import { NextRequest } from 'next/server';
import { UnifiedResearchAgent } from '@/app/lib/models/unified-research-agent';
import { env } from '@/app/lib/env';
import { modelRegistry } from '@/app/lib/models/providers';

// Add a simple logger utility for API routes
const apiLogger = (message: string, data?: any) => {
  if (env.IS_DEV) {
    const timestamp = new Date().toISOString().substring(11, 19);
    if (data) {
      console.log(`[${timestamp}] 🔌 [API] ${message}`, data);
    } else {
      console.log(`[${timestamp}] 🔌 [API] ${message}`);
    }
  }
};

export async function POST(req: NextRequest) {
  // Always return a mock response during build time or if missing environment variables
  if (env.IS_BUILD_TIME || env.IS_BROWSER || !env.IS_VALID()) {
    // If we're in browser or missing env vars, return a friendly message
    const reason = env.IS_BROWSER ? 'client-side' : (env.IS_BUILD_TIME ? 'build-time' : 'missing environment variables');
    
    console.log(`⚠️ Research API called during ${reason} - returning friendly error message`);
    return new Response(
      JSON.stringify({
        type: 'error',
        content: `API cannot be used directly from ${reason}. Please ensure server environment variables are properly configured.`,
      }),
      {
        status: 200,  // Use 200 to prevent error pages
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const start = Date.now();
  apiLogger('Research API route called');
  
  try {
    // Extract query parameters
    const { query, options = { isDeepResearch: false, depth: 2, breadth: 3 }, modelKey = '' } = await req.json();
    
    apiLogger('Request parameters', { 
      query: query?.substring(0, 50) + (query?.length > 50 ? '...' : ''),
      isDeepResearch: options.isDeepResearch,
      depth: options.depth,
      breadth: options.breadth,
      model: modelKey
    });

    // Validate the model key
    let validatedModelKey = modelKey;
    if (!modelKey || !modelRegistry.getModelConfig(modelKey)) {
      // Use default model if invalid
      validatedModelKey = env.DEFAULT_MODEL_KEY;
      apiLogger(`Invalid model key: ${modelKey}, using default: ${validatedModelKey}`);
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start processing in the background
    (async () => {
      try {
        // Initialize the agent with a progress callback and model
        const agent = new UnifiedResearchAgent({
          progressCallback: (progress) => {
            // Stream progress updates to the client
            try {
              const progressUpdate = options.isDeepResearch 
                ? JSON.stringify({
                    type: 'progress',
                    progress: progress.progress || 0,
                    status: progress.status || `Researching depth ${progress.currentDepth}/${progress.totalDepth}`,
                    details: {
                      depth: {
                        current: progress.currentDepth,
                        total: progress.totalDepth
                      },
                      breadth: {
                        current: progress.currentBreadth,
                        total: progress.totalBreadth
                      },
                      queries: {
                        current: progress.completedQueries,
                        total: progress.totalQueries,
                        currentQuery: progress.currentQuery
                      }
                    }
                  })
                : JSON.stringify({
                    type: 'progress',
                    progress: progress.progress || 0,
                    status: progress.status || 'Researching...'
                  });
              
              writer.write(encoder.encode(progressUpdate + '\n')).catch(err => {
                console.error('Error writing progress update:', err.message);
              });
            } catch (error) {
              console.error('Error sending progress update:', error);
            }
          },
          modelKey: validatedModelKey
        });

        // Process the query and stream the results
        let chunkCount = 0;
        for await (const chunk of agent.processQueryStream(query, options)) {
          chunkCount++;
          try {
            await writer.write(encoder.encode(chunk));
          } catch (writeError: unknown) {
            console.error('Error writing chunk to stream:', writeError instanceof Error ? writeError.message : writeError);
            break; // Exit the loop if we can't write
          }
        }
        
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        apiLogger(`Research completed in ${duration}s`, { chunkCount });
      } catch (error) {
        console.error('Error during agent processing:', error);
        try {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                content: 'An error occurred during research. Please try again with a more specific query.',
              }) + '\n'
            )
          );
        } catch (writeError: unknown) {
          console.error('Error writing error message to stream:', writeError instanceof Error ? writeError.message : writeError);
        }
      } finally {
        try {
          await writer.close();
        } catch (closeError: unknown) {
          console.error('Error closing writer (this is normal if client disconnected):', closeError instanceof Error ? closeError.message : closeError);
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({
        type: 'error',
        content: 'An error occurred processing your request.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 