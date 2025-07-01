import { safeJsonParse } from './util';
import { getAccessToken, getOpenAPIBaseURL } from './tcb';
import { BotContext } from './bot_context';
import { DynamicTool } from "langchain/tools";

export class ChatToolService {
  botContext: BotContext<any>;

  constructor(botContext: BotContext<any>) {
    this.botContext = botContext;
  }

  // 获取消息相关的联网信息
  async getSearchNetworkContent({ msg, searchEnable }: { msg: string, searchEnable: boolean }): Promise<any> {
    if (!searchEnable) {
      return {
        content: '',
        searchInfo: null,
      };
    }

    const token = getAccessToken(this.botContext.context);
    const url = `${getOpenAPIBaseURL(this.botContext.context)}/v1/aibot/tool/search-network`;

    // 获取联网知识
    try {
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botId: this.botContext.info.botId,
          msg: msg,
        }),
      });

      const reader = fetchRes?.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      let chunk = '';
      let buffer = '';
      let searchInfo: any;
      if (reader) {
        do {
          const { done: currentDone, value } = await reader.read();
          done = currentDone;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // 处理接收到的完整事件
          const events = buffer.split('\n\n'); // SSE 事件以双换行分隔
          for (let i = 0; i < events.length - 1; i++) {
            const event = events[i].trim();
            if (event === 'data: [DONE]' || event === 'data:[DONE]') {
              continue;
            }
            if (event.startsWith('data:')) {
              const data = event.substring(5).trim(); // 获取 data: 后面的数据
              const searchNetInfo = safeJsonParse(data); // 解析 JSON 数据
              console.log(searchNetInfo);
              chunk = chunk + (searchNetInfo?.content ?? '');
              searchInfo = searchNetInfo?.search_info;
            }
          }
          buffer = events[events.length - 1];
        } while (!done);
      }

      //   console.log("查询联网知识结果:", chunk);
      return {
        content: chunk,
        searchInfo: searchInfo || {},
      };
    } catch (error) {
      console.log('查询联网知识失败 error:', error);
      throw error;
    }

    return {
      content: '',
      searchInfo: null,
    };
  }

  // 获取消息相关的文件信息
  async getSearchFileContent({ msg, files }: { msg: string, files: any[] }): Promise<string> {
    if (!this.botContext.info.searchFileEnable || !files || files.length === 0) {
      return '';
    }

    const token = getAccessToken(this.botContext.context);
    const url = `${getOpenAPIBaseURL(this.botContext.context)}/v1/aibot/tool/chat-file`;
    console.log("files", files)

    // 获取文件信息知识
    try {
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botId: this.botContext.info.botId,
          msg: msg,
          fileList: files,
        }),
      });
      const reader = fetchRes?.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      let chunk = '';
      let buffer = '';
      if (reader) {
        do {
          const { done: currentDone, value } = await reader.read();
          done = currentDone;
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // 处理接收到的完整事件
          const events = buffer.split('\n\n'); // SSE 事件以双换行分隔
          for (let i = 0; i < events.length - 1; i++) {
            const event = events[i].trim();
            if (event === 'data: [DONE]' || event === 'data:[DONE]') {
              continue;
            }
            if (event.startsWith('data:')) {
              const data = event.substring(5).trim(); // 获取 data: 后面的数据
              const searchFileInfo = safeJsonParse(data); // 解析 JSON 数据
              chunk = chunk + (searchFileInfo?.content ?? '');
            }
          }
          buffer = events[events.length - 1];
        } while (!done);
      }
      console.log('查询文件内容结果:', chunk);
      return chunk;
    } catch (error) {
      console.log('查询文件信息失败 error:', error);
    }

    return '';
  }

  // 获取消息相关的数据库信息
  async getSearchDatabaseContent({ msg }: { msg: string }): Promise<any> {
    if (
      !this.botContext.info.databaseModel ||
      this.botContext.info.databaseModel.length === 0
    ) {
      return null;
    }

    const token = getAccessToken(this.botContext.context);
    const url = `${getOpenAPIBaseURL(this.botContext.context)}/v1/aibot/tool/chat-db`;

    // 获取数据库知识
    try {
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botId: this.botContext.info.botId,
          msg: msg,
          databaseModel: this.botContext.info.databaseModel,
        }),
      });
      const reader = fetchRes?.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      let buffer = '';
      let databaseInfo: any;
      if (reader) {
        do {
          const { done: currentDone, value } = await reader.read();
          done = currentDone;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // 处理接收到的完整事件
          const events = buffer.split('\n\n'); // SSE 事件以双换行分隔
          for (let i = 0; i < events.length - 1; i++) {
            const event = events[i].trim();
            if (event === 'data: [DONE]' || event === 'data:[DONE]') {
              continue;
            }
            if (event.startsWith('data:')) {
              const data = event.substring(5).trim(); // 获取 data: 后面的数据
              databaseInfo = safeJsonParse(data)?.search_result; // 解析 JSON 数据
            }
          }
          buffer = events[events.length - 1];
        } while (!done);
      }
      //   console.log("查询数据库内容结果:", databaseInfo);
      return databaseInfo;
    } catch (error) {
      console.log('查询数据库失败 error:', error);
      return null;
    }
  }

  // 获取消息相关的知识库信息
  async getSearchKnowledgeContent({ msg }: { msg: string }): Promise<any[]> {
    if (
      !this.botContext.info.knowledgeBase ||
      this.botContext.info.knowledgeBase.length === 0
    ) {
      return [];
    }

    const token = getAccessToken(this.botContext.context);
    const url = `${getOpenAPIBaseURL(this.botContext.context)}/v1/aibot/tool/chat-knowledge`;

    // 获取数据库知识
    try {
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botId: this.botContext.info.botId,
          msg: msg,
          knowledgeBase: this.botContext.info.knowledgeBase,
        }),
      });
      const reader = fetchRes?.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      let documents: any[] = [];
      let buffer = '';
      if (reader) {
        do {
          const { done: currentDone, value } = await reader.read();
          done = currentDone;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // 处理接收到的完整事件
          const events = buffer.split('\n\n'); // SSE 事件以双换行分隔
          for (let i = 0; i < events.length - 1; i++) {
            const event = events[i].trim();
            if (event === 'data: [DONE]' || event === 'data:[DONE]') {
              continue;
            }
            if (event.startsWith('data:')) {
              const data = event.substring(5).trim(); // 获取 data: 后面的数据
              const document: any[] = safeJsonParse(data)?.documents; // 解析 JSON 数据
              documents.push(...document);
            }
          }
          buffer = events[events.length - 1];
        } while (!done);
      }

      //   console.log("查询知识库信息:", documents);
      return documents;
    } catch (error) {
      console.log('查询知识库失败 error:', error);
    }

    return [];
  }

  // 联网 tool 定义
  async getSearchNetworkTool() {
    const searchNetworkTool = new DynamicTool({
      name: "search_network",
      description: "Search the web for the latest information",
      func: async (input: string) => {
        const { content, searchInfo } = await this.getSearchNetworkContent({ msg: input, searchEnable: true });
        return {
          content,
          searchInfo,
        };
      },
    });
    return searchNetworkTool;
  }

  // 文件 tool 定义
  async getSearchFileTool(files: any[]) {
    console.log("🔧 创建文件解析工具，files:", files);
    const searchFileTool = new DynamicTool({
      name: "search_file",
      description: "解析图片链接或文件链接对应的内容，并返回解析结果。当用户询问文件内容、图片内容时必须调用此工具。",
      func: async (input: string, other) => {
        console.log("🚀 search_file 工具被调用!");
        console.log("🚀 输入参数 input:", input);
        console.log("🚀 文件列表 files:", files);

        try {
          const fileContent = await this.getSearchFileContent({ msg: input, files });
          console.log("✅ 文件解析成功，结果长度:", fileContent?.length || 0);
          return fileContent;
        } catch (error) {
          console.error("❌ 文件解析失败:", error);
          throw error;
        }
      },
    });
    return searchFileTool;
  }

  // 数据库 tool 定义
  async getSearchDatabaseTool() {
    const searchDatabaseTool = new DynamicTool({
      name: "search_database",
      description: "Search the database for the latest information",
      func: async (input: string) => {
        const databaseContent = await this.getSearchDatabaseContent({ msg: input });
        return databaseContent;
      },
    });
    return searchDatabaseTool;
  }

  // 知识库 tool 定义
  async getSearchKnowledgeTool() {
    const searchKnowledgeTool = new DynamicTool({
      name: "search_knowledge",
      description: "Search the knowledge base for the latest information",
      func: async (input: string) => {
        const knowledgeContent = await this.getSearchKnowledgeContent({ msg: input });
        return knowledgeContent
          .filter(({ Score }) => Score > 0.7)
          .map(({ Data }) => {
            return `
    
               ### 内容：
               ${Data.Text}
               `;
          })
          .join('\n');
      },
    });
    return searchKnowledgeTool;
  }
}
