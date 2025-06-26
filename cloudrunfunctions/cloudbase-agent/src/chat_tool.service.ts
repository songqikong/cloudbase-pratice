import { BotContext } from './bot_context';
import { getAccessToken, getOpenAPIBaseURL } from './tcb';
import { safeJsonParse } from './utils';

export class ChatToolService {
  botContext: BotContext<any>;

  constructor(botContext: BotContext<any>) {
    this.botContext = botContext;
  }

  async prepareToolsContent({ msg, searchEnable, files }) {
    let searchDbInfo = undefined;
    let knowDocumentList = [];
    let searchNetContent: any;
    let searchFileContent: any;

    searchDbInfo = await this.getSearchDatabaseContent({ msg });
    if (!searchDbInfo) {
      [knowDocumentList, searchNetContent, searchFileContent] = await Promise.all([
        this.getSearchKnowledgeContent({ msg }), // 知识库
        this.getSearchNetworkContent({ msg, searchEnable }), // 联网查询
        this.getSearchFileContent({ msg, files: files }),
      ]);
    }

    // 响应消息
    await this.handlerDatabaseContent({ searchDbInfo });
    await this.handlerKnowledgeContent({ knowDocumentList });
    await this.handlerSearchNetwork({ searchInfo: searchNetContent?.searchInfo });
    await this.handlerSearchFileContent({ searchFileContent });

    return {
      searchDbInfo,
      knowDocumentList,
      searchNetContent: searchNetContent?.content,
      searchFileContent,
    };
  }

  // 获取消息相关的联网信息
  async getSearchNetworkContent({ msg, searchEnable }): Promise<any> {
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

      const reader = fetchRes.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      let chunk = '';
      let buffer = '';
      let searchInfo: any;
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

      // console.log('查询联网知识结果:', chunk);
      return {
        content: chunk,
        searchInfo: searchInfo || {},
      };
    } catch (error) {
      console.log('查询联网知识失败 error:', error);
      throw error();
    }
  }

  async handlerSearchNetwork({ searchInfo }) {
    if (!searchInfo) {
      return;
    }
    const result = {
      type: 'search',
      created: Date.now(),
      model: 'hunyuan',
      role: 'assistant',
      content: '',
      search_info: searchInfo,
      finish_reason: 'continue',
    };

    this.botContext.bot.sseSender.send(`data: ${JSON.stringify(result)}\n\n`);
  }

  // 获取消息相关的文件信息
  async getSearchFileContent({ msg, files }): Promise<string> {
    if (!this.botContext.info.searchFileEnable || !files || files.length === 0) {
      return '';
    }

    const token = getAccessToken(this.botContext.context);
    const url = `${getOpenAPIBaseURL(this.botContext.context)}/v1/aibot/tool/chat-file`;

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
      const reader = fetchRes.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      let chunk = '';
      let buffer = '';
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
      console.log('查询文件内容结果:', chunk);
      return chunk;
    } catch (error) {
      console.log('查询文件信息失败 error:', error);
    }
  }

  async handlerSearchFileContent({ searchFileContent }) {
    console.log('searchFileContent:', searchFileContent);
    if (!searchFileContent || searchFileContent === '') {
      return;
    }
    const result = {
      type: "'search_file',",
      created: Date.now(),
      model: 'hunyuan',
      role: 'assistant',
      content: searchFileContent ?? '',
      finish_reason: 'continue',
    };
    this.botContext.bot.sseSender.send(`data: ${JSON.stringify(result)}\n\n`);
  }

  // 获取消息相关的数据库信息
  async getSearchDatabaseContent({ msg }): Promise<any> {
    if (!this.botContext.info.databaseModel || this.botContext.info.databaseModel.length === 0) {
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
      const reader = fetchRes.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      let buffer = '';
      let databaseInfo: any;
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
      //   console.log("查询数据库内容结果:", databaseInfo);
      return databaseInfo;
    } catch (error) {
      console.log('查询数据库失败 error:', error);
      return null;
    }
  }

  async handlerDatabaseContent({ searchDbInfo }) {
    if (!searchDbInfo) {
      return;
    }
    const result = {
      type: 'db',
      created: Date.now(),
      role: 'assistant',
      content: '',
      finish_reason: 'continue',
      search_results: {
        relateTables: searchDbInfo?.relateTables?.length ?? 0,
      },
    };
    this.botContext.bot.sseSender.send(`data: ${JSON.stringify(result)}\n\n`);
  }

  // 获取消息相关的知识库信息
  async getSearchKnowledgeContent({ msg }): Promise<string[]> {
    if (!this.botContext.info.knowledgeBase || this.botContext.info.knowledgeBase.length === 0) {
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
      const reader = fetchRes.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done: boolean;
      const documents: any[] = [];
      let buffer = '';
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

      //   console.log("查询知识库信息:", documents);
      return documents;
    } catch (error) {
      console.log('查询知识库失败 error:', error);
    }
  }

  async handlerKnowledgeContent({ knowDocumentList }) {
    if (!knowDocumentList || knowDocumentList?.length === 0) {
      return;
    }
    const documentSetNameList = [];
    const fileMetaDataList = [];
    knowDocumentList.forEach(({ Score, DocumentSet }) => {
      if (Score < 0.7) {
        return;
      }
      documentSetNameList.push(DocumentSet?.DocumentSetName);
      fileMetaDataList.push(DocumentSet?.FileMetaData);
    });

    // 知识库
    if (documentSetNameList.length !== 0 && fileMetaDataList.length !== 0) {
      const result = {
        type: 'knowledge',
        created: Date.now(),
        role: 'assistant',
        content: '',
        finish_reason: 'continue',
        knowledge_base: Array.from(documentSetNameList),
        knowledge_meta: Array.from(fileMetaDataList),
      };
      this.botContext?.bot?.sseSender?.send(`data: ${JSON.stringify(result)}\n\n`);
    }
  }
}
