import { MyBot } from './bot';
import { IBotConfig } from './bot_config';
import { BotInfo } from './bot_info';
import { TcbContext } from './tcb';

export class BotContext<StateT> {
  context: TcbContext;

  config: IBotConfig;
  bot: MyBot;
  info: BotInfo;
  state: StateT;

  constructor(context: TcbContext, state: StateT) {
    this.context = context;
    this.state = state;
  }
}
