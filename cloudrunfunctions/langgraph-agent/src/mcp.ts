import { PostClientTransport } from '@cloudbase/mcp/transport/client/post';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getAccessToken } from './tcb';

import { BotContext } from './bot_context';

export interface McpTools {
  name: string;
}

export interface McpServer {
  name: string;
  url: string;
  transport: string;
  tools: McpTools[];
}

export class McpManager {
  private botContext: BotContext<any>;
  private mcpClientMap: Record<string, Client> = {};
  public mcpServers: McpServer[];

  constructor(botContext: BotContext<any>) {
    this.botContext = botContext;
    this.mcpServers = this.botContext.info?.mcpServerList || [];
  }

  async close() {
    try {
      const clients = Object.values(this.mcpClientMap);
      await Promise.all(clients.map((v) => v?.close()));
    } catch (error) {
      console.log(error);
    }
  }

  // MCP 客户端
  async getMCPClient(mcpServerUrl: string) {
    const apiKey = getAccessToken(this.botContext.context);
    const transport = new PostClientTransport(
      new URL(mcpServerUrl),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      }
    );

    const proxiedTransport = new Proxy(transport, {
      set(target, prop, value) {
        if (prop === "onmessage") {
          target.onmessage = (message: any) => {
            if (
              (message as any)?.result?.toolResult &&
              !(message as any).result.structuredContent
            ) {
              (message as any).result.structuredContent = (
                message as any
              ).result.toolResult;
            }
            value(message);
          };
          return true;
        }
        return Reflect.set(target, prop, value);
      },
    });

    const client = new Client(
      {
        name: "langgraph-agent",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    await client.connect(proxiedTransport);
    return client;
  }

  async initMCPClientMap() {
    await Promise.all(this.mcpServers.map(async (mcpServer) => {
      this.mcpClientMap[mcpServer.name] = await this.getMCPClient(mcpServer.url);
    }));
    return this.mcpClientMap;
  }
}
