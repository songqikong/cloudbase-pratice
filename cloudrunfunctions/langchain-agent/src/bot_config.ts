import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface BotConfig {
  name: string;
  model: string;
  baseURL: string;
  apiKey?: string;
  agentSetting: string;
  introduction: string;
  welcomeMessage: string;
  avatar: string;
  type: string;
  isNeedRecommend: boolean;
  searchNetworkEnable: boolean;
  searchFileEnable: boolean;
  knowledgeBase: any[];
  databaseModel: any[];
  initQuestions: string[];
}

export class BotConfig {
  static instance: any;
  data!: BotConfig;

  constructor() {
    if (BotConfig.instance) {
      return BotConfig.instance;
    }
    BotConfig.instance = this;

    // 读取配置文件，并解析到data中
    try {
      const yamlData = fs.readFileSync(path.join(__dirname, '..', 'agent-config.yaml'), 'utf8');
      const yData: BotConfig = yaml.load(yamlData) as BotConfig;
      console.log('yaml:', yData);
      // 初始化其他属性
      this.data = yData;
    } catch (err) {
      console.error('Error reading or parsing file:', err);
    }
  }

  getData(): BotConfig {
    return this.data;
  }

  setData(key: string, value: any) {
    this.data[key] = value;
  }
}

export const botConfig: BotConfig = (new BotConfig()).getData();
