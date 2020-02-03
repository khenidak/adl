import { CommandLineAction, CommandLineParser, CommandLineFlagParameter } from '@microsoft/ts-command-line'

// commands
import { showStoreAction } from './cmd_showstore'
import { verifyConformanceAction } from './cmd_verifyconformance'
import { machineryAction } from './cmd_machinery'
import { diffAction } from './cmd_diff'
import { appContext } from './appContext'

export class adlCliParser extends CommandLineParser {
  private _verbose: CommandLineFlagParameter;

	// TODO: use  printer that can do json/yaml or just pretty print

  public constructor(private ctx: appContext) {
    super({
      toolFilename: 'protoApiServer',
      toolDescription: ''
    });

			//	pass context down the line
			this.addAction(new showStoreAction(ctx));
			this.addAction(new diffAction(ctx));
			this.addAction(new verifyConformanceAction(ctx));
			this.addAction(new machineryAction(ctx));
  }


  protected onDefineParameters(): void { // abstract
    this._verbose = this.defineFlagParameter({
      parameterLongName: '--verbose',
      parameterShortName: '-v',
      description: 'Show extra logging detail'
    });
  }

  protected onExecute(): Promise<void> { // override
		//BusinessLogic.configureLogger(this._verbose.value);
		return super.onExecute();
  }
}
