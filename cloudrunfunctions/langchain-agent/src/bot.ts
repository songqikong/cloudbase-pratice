import { BotCore, IBot, SendMessageInput, GetBotInfoOutput } from "@cloudbase/aiagent-framework";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatToolService } from './chat_tool.service';

import { BotContext } from './bot_context';
import { botConfig } from './bot_config';
import { BotInfo } from './bot_info';

// 扩展 SendMessageInput 接口以支持 files
interface ExtendedSendMessageInput extends SendMessageInput {
  files?: string[];
}

async function wrapResult<T>(
  fn: () => T
): Promise<
  { success: true; data: Awaited<T> } | { success: false; error: unknown }
> {
  try {
    const data = await Promise.resolve(fn());
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
}

async function logIfError<T>(fn: () => T, log: (error: unknown) => void) {
  const result = await wrapResult(fn);
  if (result.success) {
    return result.data;
  } else {
    log(result.error)
    throw result.error
  }
}

export class MyBot extends BotCore implements IBot {
  chatToolService!: ChatToolService;
  private tools: any[] = []
  private toolsByName: any = {}
  botContext!: BotContext<any>;

  constructor(context: any) {
    super(context)
    // 初始化工具列表
    this.tools = []
    this.toolsByName = {}

    const botContext = new BotContext(context, {});
    botContext.bot = this;
    botContext.info = new BotInfo(this.botId, botConfig);
    botContext.config = Object.assign({}, botConfig);
    this.botContext = botContext;
    this.chatToolService = new ChatToolService(botContext);
  }

  async prepareTools(files: any[]) {
    const tools = []
    if (this.botContext.info.searchNetworkEnable) {
      const searchNetworkTool = await this.chatToolService.getSearchNetworkTool();
      tools.push(searchNetworkTool);
      this.toolsByName.search_network = searchNetworkTool;
    }

    if (this.botContext.info.searchFileEnable) {
      const searchFileTool = await this.chatToolService.getSearchFileTool(files);
      tools.push(searchFileTool);
      this.toolsByName.search_file = searchFileTool;
    }

    if (this.botContext.info.databaseModel) {
      const searchDatabaseTool = await this.chatToolService.getSearchDatabaseTool();
      tools.push(searchDatabaseTool);
      this.toolsByName.search_database = searchDatabaseTool;
    }

    if (this.botContext.info.knowledgeBase) {
      const searchKnowledgeTool = await this.chatToolService.getSearchKnowledgeTool()
      tools.push(searchKnowledgeTool);
      this.toolsByName.search_knowledge = searchKnowledgeTool;
    }

    this.tools = tools;
    return tools
  }

  async sendMessage({ msg, files = [] }: ExtendedSendMessageInput): Promise<void> {
    const envId =
      this.context.extendedContext?.envId || process.env.CLOUDBASE_ENV_ID;

    !envId &&
      console.warn(
        "Missing envId, if running locally, please configure \`CLOUDBASE_ENV_ID\` environment variable."
      );

    // 初始化 LLM
    const llm = await logIfError(
      () =>
        new ChatDeepSeek({
          streaming: false,
          model: this.botContext.config.model,
          apiKey: this.apiKey,
          configuration: {
            baseURL: `https://${envId}.api.tcloudbasegateway.com/v1/ai/deepseek/v1`,
          },
        }),
      (e) => console.error(`create deepseek failed`, e)
    );

    const streamingLLM = await logIfError(
      () =>
        new ChatDeepSeek({
          streaming: true,
          model: "deepseek-v3-0324",
          apiKey: this.apiKey,
          configuration: {
            baseURL: `https://${envId}.api.tcloudbasegateway.com/v1/ai/deepseek/v1`,
          },
        }),
      (e) => console.error(`create streaming deepseek failed`, e)
    );

    if (this.tools.length === 0) {
      await this.prepareTools(files)
    }

    const llmWithTools = llm.bindTools(this.tools)

    // 构建工具列表
    const systemPrompt = `
    【角色】你将会扮演 ${this.botContext?.info.name}
    【设定和要求】${this.botContext?.info?.agentSetting}，
     同时你拥有最多以下4种专业工具来帮助用户解决问题。请根据用户的问题类型和需求，智能选择合适的工具：

## 可用工具说明：

### 1. 联网搜索工具 (search_network)
**使用场景：**
- 用户询问最新信息、实时数据、新闻事件
- 需要获取当前时间相关的信息
- 查询股票价格、天气、体育赛事等实时数据
- 搜索最新的技术资讯、产品发布等
**触发关键词：** "最新"、"现在"、"今天"、"实时"、"新闻"、"股价"、"天气"等

### 2. 文件/图片链接解析识别工具 (search_file)
**使用场景：**
- **重要：当用户消息中包含任何类型的文件链接时，必须优先调用此工具进行文件分析**
**调用规则：**
- 如果用户消息中包含任何文件链接，都必须首先调用此工具
- 即使用户只是问"这个文件里有什么"、"分析这个文档"、"识别这个图片"等问题，也要调用工具
**触发关键词：** "文件"、"上传"、"图片"、"文档"、"音频"、"视频"、"PDF"、"表格"、"识别"、"解析"、"分析这个文件"、"文件中有什么"等

### 3. 数据库检索工具 (search_database)
**使用场景：**
- 查询结构化业务数据、用户数据、订单信息等
- 统计分析、数据报表需求
- 历史交易记录、用户行为数据查询
- 需要精确的数据库查询结果
**触发关键词：** "查询"、"统计"、"数据"、"记录"、"订单"、"用户信息"、"历史"等

### 4. 知识库检索工具 (search_knowledge)
**使用场景：**
- 查询企业内部知识库、业务文档、产品手册
- 公司政策、流程规范、标准操作程序
- 专业领域知识、行业最佳实践
- 企业FAQ、内部培训资料、技术规范
- 用户自定义的专业知识内容
**触发关键词：** "如何"、"怎么"、"政策"、"流程"、"规范"、"手册"、"标准"、"最佳实践"、"内部文档"等

## 工具选择策略：

1. **优先级判断：**
   - **最高优先级：如果用户消息中包含任何文件链接（图片、文档等）→ 必须先调用文件链接解析工具**
   - 如果询问最新/实时信息 → 使用联网搜索工具
   - 如果询问具体数据查询 → 使用数据库检索工具
   - 如果询问业务知识/内部文档/流程规范 → 使用知识库检索工具

2. **文件处理规则：**
   - 当接收到包含任何类型文件链接的消息时，不管用户的文字问题是什么，都要先调用 search_file 工具分析文件
   - 基于工具返回的文件分析结果，再结合用户的问题给出完整回答
   - 不要直接回答文件相关问题而不调用工具

3. **组合使用：**
   - 可以根据需要组合使用多个工具
   - 先用文件解析工具分析用户上传的文件链接，再用知识库查询相关业务信息进行对比
   - 先用数据库查询具体数据，再结合知识库提供业务解释

4. **无工具场景：**
   - 简单的对话、闲聊、数学计算等可以直接回答
   - 不需要外部信息的问题直接基于已有知识回答

请根据用户的具体问题，智能选择合适的工具来提供最准确和有用的回答。特别注意：如果消息中包含任何格式的文件，必须调用 search_file 工具！`;

    const humanMessage = files.length ? new HumanMessage({
      content: [
        { type: "text", text: msg + `\n\n用户上传的文件链接：${files.join('\n')}` },
        ...files.map((file: string) => {
          const fileExtension = file.split('.').pop()?.toLowerCase() || '';
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

          if (imageExtensions.includes(fileExtension)) {
            // 图片文件使用 image_url 格式
            return { type: "image_url", image_url: { url: file } };
          } else {
            // 非图片文件使用 file 描述格式
            return {
              type: "file",
              source_type: "url",
              url: file,
            };
          }
        }),
        // ...files.map((file: string) => ({ type: "image", source_type: "url", url: file })),
      ]
    }) : new HumanMessage(msg)

    const messages = [new SystemMessage(systemPrompt), humanMessage];

    // 添加调试信息
    console.log('=== 调试信息 ===');
    console.log('可用工具数量:', this.tools.length);
    console.log('工具名称:', this.tools.map(t => t.name));
    console.log('用户消息包含文件数量:', files.length);
    console.log('构建的消息:', JSON.stringify(messages, null, 2));
    console.log('===============');

    const aiMessage = await logIfError(() => llmWithTools.invoke(messages), (e) => console.error(`invoke llm failed`, e, messages))
    console.log('AI 响应:', aiMessage);
    console.log('工具调用:', aiMessage.tool_calls);
    messages.push(aiMessage);

    for (const toolCall of aiMessage.tool_calls as any) {
      const selectedTool = this.toolsByName[toolCall.name];
      if (!selectedTool) {
        console.error(`Tool ${toolCall.name} not found`);
        continue;
      }
      const toolMessage = await logIfError(() => selectedTool.invoke(toolCall), (e) => console.error(`invoke tool failed`, e, toolCall))
      messages.push(toolMessage);
    }

    console.log('final messages', messages);

    // 生成最终答案
    const finalStream = await logIfError(() => streamingLLM.stream(messages), (e) => console.error(`stream llm failed`, e, messages))
    let fullResponse = "";

    try {
      for await (const chunk of finalStream) {
        // 确保 content 是字符串类型
        const content = typeof chunk.content === 'string' ? chunk.content : '';
        fullResponse += content;
        console.log("chunk", content)

        // 只发送必要的字段，避免重复字段问题
        this.sseSender.send({
          data: {
            content: content,
            role: 'assistant',
            type: 'text',
            model: "deepseek-v3-0324",
            finish_reason: "",
          },
        });
      }
    } catch (streamError) {
      console.error('Stream processing error:', streamError);
      this.sseSender.send({
        data: {
          content: "\n\n抱歉，处理您的请求时发生了错误。",
          role: 'assistant',
          type: 'text',
          model: "deepseek-v3-0324",
          finish_reason: "error",
        },
      });
    } finally {
      console.log('fullResponse', fullResponse);
      this.sseSender.end();
    }
  }

  get apiKey() {
    const accessToken =
      this.context?.extendedContext?.accessToken ||
      process.env.CLOUDBASE_API_KEY;
    if (typeof accessToken !== "string") {
      throw new Error("Invalid accessToken");
    }

    return accessToken.replace("Bearer", "").trim();
  }

  async getBotInfo(): Promise<GetBotInfoOutput> {
    const botInfo: GetBotInfoOutput = {
      botId: this.botId,
      name: botConfig.name,
      model: botConfig.model,
      agentSetting: botConfig.agentSetting,
      introduction: botConfig.introduction,
      welcomeMessage: botConfig.welcomeMessage,
      avatar: botConfig.avatar,
      isNeedRecommend: botConfig.isNeedRecommend,
      knowledgeBase: botConfig.knowledgeBase,
      databaseModel: botConfig.databaseModel,
      initQuestions: botConfig.initQuestions,
      searchEnable: botConfig.searchNetworkEnable,
      searchFileEnable: botConfig.searchFileEnable,
    };

    return botInfo;
  }
}