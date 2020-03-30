import { CommandLineChoiceParameter, CommandLineAction, CommandLineParser, CommandLineFlagParameter } from '@microsoft/ts-command-line'

// commands
import { showStoreAction } from './cmd_showstore'
import { verifyConformanceAction } from './cmd_verifyconformance'
import { machineryAction } from './cmd_machinery'
import { diffAction } from './cmd_diff'
import { appContext } from './appContext'

import * as adlruntime from '@azure-tools/adl.runtime'

export class adlCliParser extends CommandLineParser {
 	private _log_level: CommandLineChoiceParameter;

	// TODO: use  printer that can do json/yaml or just pretty print

  public constructor(private ctx: appContext) {
    super({
      toolFilename: 'cairo',
      toolDescription: ''
    });

			//	pass context down the line
			this.addAction(new showStoreAction(ctx));
			this.addAction(new diffAction(ctx));
			this.addAction(new verifyConformanceAction(ctx));
			this.addAction(new machineryAction(ctx));
  }


  protected onDefineParameters(): void {
		this._log_level = this.defineChoiceParameter({
			parameterLongName: '--log-level',
			parameterShortName: '-a',
			alternatives: [ 'none', 'err', 'warn', 'info', 'verbose' ],
			defaultValue: 'err',
			description: 'log level',
			required: false,
		});
  }

  protected onExecute(): Promise<void> {
		// wire up log level
		this.ctx.opts.logger.logLevel = adlruntime.apiProcessingLogLevel[this._log_level.value as string];
		return super.onExecute();
  }
}
