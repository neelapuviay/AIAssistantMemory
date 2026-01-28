import { Memory } from "mem0ai/oss";

let memoryInstance: Memory | null = null;

export interface MemoryConfig {
  llm?: {
    provider: string;
    config: {
      apiKey?: string;
      model?: string;
      modelProperties?: Record<string, any>;
    };
  };
  embedder?: {
    provider: string;
    config: {
      apiKey?: string;
      model?: string;
      modelProperties?: Record<string, any>;
    };
  };
  enableGraph?: boolean;
  graphStore?: {
    provider: string;
    config: {
      url: string;
      username: string;
      password: string;
      database?: string;
    };
    customPrompt?: string;
    llm?: any;
  };
}

export function getMemoryInstance(): Memory {
  if (!memoryInstance) {
    const customFetch = async (url: string | URL | Request, options: any) => {
      if (!options || !options.body || options.method !== 'POST') return fetch(url, options);

      const urlString = url.toString();
      const isChat = urlString.includes('/chat/completions');
      if (!isChat) return fetch(url, options);

      try {
        let bodyObj: any = null;
        if (typeof options.body === 'string') {
          bodyObj = JSON.parse(options.body);
          if (typeof bodyObj === 'string') bodyObj = JSON.parse(bodyObj);
        } else if (typeof options.body === 'object' && !ArrayBuffer.isView(options.body)) {
          bodyObj = options.body;
        }

        if (bodyObj && !bodyObj.stream) {
          console.log(`[DEBUG] mem0ai: Upstreaming non-streaming call to ${url}`);
          bodyObj.stream = true;
          if (bodyObj.stream_options) delete bodyObj.stream_options;
          options.body = JSON.stringify(bodyObj);

          // Crucial: remove stale Content-Length header if it exists
          if (options.headers) {
            delete options.headers['content-length'];
            delete options.headers['Content-Length'];
          }

          const response = await fetch(url, options);
          if (!response.ok) {
            console.error(`[DEBUG] mem0ai: Proxy returned error ${response.status}: ${response.statusText}`);
            return response;
          }

          // Collect the SSE stream
          if (!response.body) {
            console.warn("[DEBUG] mem0ai: Response body is empty");
            return response;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";
          let role = "assistant";
          let toolCalls: any[] = [];
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === 'data: [DONE]') {
                console.log("[DEBUG] mem0ai: Received DONE signal");
                continue;
              }
              if (!trimmed.startsWith('data: ')) continue;

              try {
                const data = JSON.parse(trimmed.substring(6));
                const delta = data.choices[0]?.delta;
                if (delta?.content) fullContent += delta.content;
                if (delta?.role) role = delta.role;
                if (delta?.tool_calls) {
                  delta.tool_calls.forEach((tc: any) => {
                    const idx = tc.index;
                    if (!toolCalls[idx]) {
                      toolCalls[idx] = {
                        id: tc.id,
                        type: tc.type || "function",
                        function: {
                          name: tc.function?.name,
                          arguments: tc.function?.arguments || ""
                        }
                      };
                    } else {
                      if (tc.function?.arguments) {
                        toolCalls[idx].function.arguments += tc.function.arguments;
                      }
                      if (tc.id) toolCalls[idx].id = tc.id;
                    }
                  });
                }
              } catch (e) {
                console.error("[DEBUG] mem0ai: Error parsing SSE line:", trimmed);
              }
            }
          }

          const fakeResponse = {
            id: "collected-" + Date.now(),
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: bodyObj.model,
            choices: [{
              index: 0,
              message: {
                role,
                content: fullContent,
                ...(toolCalls.length > 0 && { tool_calls: toolCalls.filter(Boolean) })
              },
              logprobs: null,
              finish_reason: "stop"
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          console.log(`[DEBUG] mem0ai: Collected Response content length: ${fullContent.length}, tool calls: ${toolCalls.length}`);
          if (toolCalls.length > 0) {
            console.log("[DEBUG] mem0ai: Tool Calls collected:", JSON.stringify(toolCalls.filter(Boolean), null, 2));
          }

          const ResponseCtor = (globalThis as any).Response || (global as any).Response;
          if (ResponseCtor) {
            return new ResponseCtor(JSON.stringify(fakeResponse), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const jsonStr = JSON.stringify(fakeResponse);
          return {
            ok: true,
            status: 200,
            headers: {
              get: (h: string) => h.toLowerCase() === 'content-type' ? 'application/json' : null,
              forEach: () => { }
            },
            json: async () => fakeResponse,
            text: async () => jsonStr,
          } as any;
        }
      } catch (err) {
        console.error("[DEBUG] mem0ai Stream Collective Interceptor Error:", err);
      }

      return fetch(url, options);
    };

    const config: MemoryConfig = {
      llm: {
        provider: "azure_openai",
        config: {
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          model: process.env.AZURE_OPENAI_DEPLOYMENT,
          modelProperties: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION,
            fetch: customFetch,
          },
        },
      },
      embedder: {
        provider: "azure_openai",
        config: {
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
          modelProperties: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION,
            fetch: customFetch,
          },
        },
      },
      enableGraph: true,
      graphStore: {
        provider: "neo4j",
        config: {
          url: process.env.NEO4J_URL!,
          username: process.env.NEO4J_USERNAME!,
          password: process.env.NEO4J_PASSWORD!,
          database: "neo4j",
        },
        customPrompt:
          "Please capture people, organizations, projects, preferences, and important facts mentioned by the user.",
      },
    };

    memoryInstance = new Memory(config);
  }

  return memoryInstance;
}

export const DEFAULT_USER_ID = "demo-user";
