import { BotCore, IBot, SendMessageInput, GetBotInfoOutput } from "@cloudbase/aiagent-framework";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage } from "@langchain/core/messages";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createGeneralAgent } from "./generalAgent.js";
import { llmCallback } from "./util.js";
import { omit } from "remeda";
import { ChatToolService } from './chat_tool.service';
import { BotContext } from './bot_context';
import { botConfig } from './bot_config';
import { BotInfo } from './bot_info';
import { McpManager } from './mcp';
export class MyBot extends BotCore implements IBot {
  chatToolService!: ChatToolService;
  botContext!: BotContext<any>;
  private mcpClient: Client | null = null;
  private agents: any[] = [];
  private supervisor: any = null;
  constructor(context: any) {
    super(context);
    this.mcpClient = null;
    const botContext = new BotContext(context, {});
    botContext.bot = this;
    botContext.info = new BotInfo(this.botId, botConfig);
    botContext.config = Object.assign({}, botConfig);
    this.botContext = botContext;
    this.chatToolService = new ChatToolService(botContext);
  }

  async prepareAgents(llm: any, files: any[]) {
    const agents = []

    if (this.botContext.info.searchNetworkEnable) {
      const searchNetworkTool = await this.chatToolService.getSearchNetworkTool();
      const searchAgent = createReactAgent({
        llm,
        tools: [searchNetworkTool],
        prompt:
          `你是互联网搜索专家，善于用工具联网搜索，为团队补充最新信息。不要处理进行互联网搜索之外的事情。
            **使用场景：**
            - 用户询问最新信息、实时数据、新闻事件
            - 需要获取当前时间相关的信息
            - 查询股票价格、天气、体育赛事等实时数据
            - 搜索最新的技术资讯、产品发布等
            **触发关键词：** "最新"、"现在"、"今天"、"实时"、"新闻"、"股价"、"天气"等
          `,
        name: "searchNetworkAgent",
      });
      agents.push(searchAgent);
    }

    if (this.botContext.info.searchFileEnable) {
      const searchFileTool = await this.chatToolService.getSearchFileTool(files);
      console.log("🔧 SearchFileAgent 创建，files:", files);
      const searchFileAgent = createReactAgent({
        llm,
        tools: [searchFileTool],
        prompt:
          `你是文件/图片链接解析专家。你的唯一职责就是调用 search_file 工具来解析文件或图片。
            
            **重要规则：**
            1. 收到任何消息后，必须立即调用 search_file 工具
            2. 不要解释、不要道歉、不要说"正在处理"
            3. 直接调用工具获取文件内容，然后基于工具返回的结果回答用户
            4. 如果工具调用失败，告诉用户具体的错误信息
            
            **示例流程：**
            用户："图中有什么？"
            你的行动：立即调用 search_file 工具 → 获取结果 → 基于结果回答
            
            现在立即调用 search_file 工具开始分析文件内容。`,
        name: "searchFileAgent",
      });
      agents.push(searchFileAgent);
    }

    if (this.botContext.info.knowledgeBase.length > 0) {
      const searchKnowledgeTool = await this.chatToolService.getSearchKnowledgeTool()
      const searchKnowledgeAgent = createReactAgent({
        llm,
        tools: [searchKnowledgeTool],
        prompt:
          `你是云开发知识库专家，善于用工具检索云开发知识库，为团队提供权威解答。不要处理回答知识库之外的事情。
           **使用场景：**
            - 查询企业内部知识库、业务文档、产品手册
            - 公司政策、流程规范、标准操作程序
            - 专业领域知识、行业最佳实践
            - 企业FAQ、内部培训资料、技术规范
            - 用户自定义的专业知识内容
            **触发关键词：** "如何"、"怎么"、"政策"、"流程"、"规范"、"手册"、"标准"、"最佳实践"、"内部文档"等
          `,
        name: "searchKnowledgeAgent",
      });
      agents.push(searchKnowledgeAgent);
    }

    if (this.botContext.info.databaseModel.length > 0) {
      const searchDatabaseTool = await this.chatToolService.getSearchDatabaseTool()
      const searchDatabaseAgent = createReactAgent({
        llm,
        tools: [searchDatabaseTool],
        prompt:
          `你是云开发数据模型专家，善于用工具检索云开发数据模型，为团队提供权威解答。不要处理回答数据模型之外的事情。
            **使用场景：**
            - 查询结构化业务数据、用户数据、订单信息等
            - 统计分析、数据报表需求
            - 历史交易记录、用户行为数据查询
            - 需要精确的数据库查询结果
            **触发关键词：** "查询"、"统计"、"数据"、"记录"、"订单"、"用户信息"、"历史"等
          `,
        name: "searchDatabaseAgent",
      });
      agents.push(searchDatabaseAgent);
    }

    return agents;
  }

  async sendMessage({ msg, files = [] }: SendMessageInput): Promise<void> {
    console.log("context", this.context);

    const envId =
      this.context.extendedContext?.envId || process.env.CLOUDBASE_ENV_ID;

    !envId &&
      console.warn(
        "Missing envId, if running locally, please configure \`CLOUDBASE_ENV_ID\` environment variable."
      );

    const createDeepseek = () =>
      new ChatDeepSeek({
        streaming: true,
        model: this.botContext.config.model,
        apiKey: this.apiKey,
        configuration: {
          baseURL: `https://${envId}.api.tcloudbasegateway.com/v1/ai/deepseek/v1`,
        },
        callbacks: [llmCallback],
      });

    // LLM
    const llm = createDeepseek();

    // Supervisor LLM
    const supervisorLLM = createDeepseek();

    if (!this.supervisor) {
      const agents = await this.prepareAgents(llm, files);

      let generalAgentInfo = null;
      // MCP Agent
      if (this.botContext.info.mcpServerList.length > 0) {
        const mcpManager = new McpManager(this.botContext);
        const mcpClients = await mcpManager.initMCPClientMap();
        const mcpAgent = await createGeneralAgent(mcpClients, mcpManager.mcpServers, llm);
        agents.push(mcpAgent.agent);
        generalAgentInfo = mcpAgent;
      }

      // Supervisor prompt
      let supervisorPrompt =
        "你拥有一个强大的 Agent 团队。" +
        "对于互联网搜索相关的问题，交给 searchNetworkAgent。" +
        "对于文件/图片解析相关的问题，交给 searchFileAgent。" +
        "对于云开发知识库相关的问题，交给 searchKnowledgeAgent。" +
        "对于云开发数据模型相关的问题，交给 searchDatabaseAgent。";

      // 创建 Supervisor
      if (generalAgentInfo) {
        supervisorPrompt +=
          "对于其他问题，交给 generalAgent。" +
          `generalAgent 的能力非常强大，这是 generalAgent 的描述
  === generalAgent 描述 start ===
  ${generalAgentInfo.description}
  === generalAgent 描述 end ===` +
          "如果某个专家表示无法完成任务，你也应该 fallback 给 generalAgent 处理。" +
          "如果你给出的最后答复不能解决用户的问题，你应该检查是否至少交给 generalAgent 处理过一次。如果 generalAgent 一次都没有处理过，你应该把问题交给 generalAgent 处理。";
      }

      console.log(
        "🤖 准备的 agents:",
        agents.map((x) => x.name)
      );
      console.log("📝 Supervisor prompt:", supervisorPrompt);
      this.supervisor = createSupervisor({
        agents,
        llm: supervisorLLM,
        prompt: supervisorPrompt,
      }).compile();
    }

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

    console.log("📨 构建的 humanMessage:", JSON.stringify(humanMessage, null, 2));
    console.log("🚀 开始 supervisor 协作处理...");

    // 启动协作，无需流式
    const result = await this.supervisor.invoke({
      messages: [humanMessage],
    });

    console.log("✅ Supervisor 协作完成");
    console.log("📋 最终 messages 数量:", result.messages?.length || 0);
    console.log("📋 最终 messages:", result.messages?.map((m: any) => ({
      type: m.constructor.name,
      content: typeof m.content === 'string' ? m.content.substring(0, 100) + '...' : '[非文本内容]',
      additional_kwargs: m.additional_kwargs
    })));

    // 用 finalMessages 作为 prompt，流式总结
    const streamingLLM = createDeepseek();
    const summaryStream = await streamingLLM.stream(result.messages);
    let debugContent = ''

    for await (const chunk of summaryStream) {
      debugContent += chunk.content as string;
      console.log(
        "summary chunk",
        omit(chunk, [
          "response_metadata",
          "usage_metadata",
          "lc_kwargs",
          "additional_kwargs",
          "lc_namespace",
          "lc_serializable",
        ])
      );
      this.sseSender.send({
        data: {
          content: chunk.content as string,
          role: "assistant",
          type: "text",
          model: "deepseek-v3-0324",
          finish_reason: "",
        },
      });
    }

    console.log("debugContent", debugContent);

    this.sseSender.end();
  }

  // 从上下文中获取云开发 accessToken
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
      mcpServerList: botConfig.mcpServerList as any,
    };

    return botInfo;
  }
}
