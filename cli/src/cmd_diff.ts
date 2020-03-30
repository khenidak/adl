import { CommandLineAction, CommandLineFlagParameter } from '@microsoft/ts-command-line'
import { appContext } from './appContext'



export class diffAction extends CommandLineAction {

  public constructor(private ctx: appContext) {
    super({
      actionName: 'diff',
      summary: '',
      documentation: ''
    });
  }

  protected onExecute(): Promise<void> {
            return new Promise<void>( () => {return;});
  }

  protected onDefineParameters(): void {
  }
}


