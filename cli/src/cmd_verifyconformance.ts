import { CommandLineAction, CommandLineParser, CommandLineFlagParameter } from '@microsoft/ts-command-line'
import { appContext } from './appContext'

import * as adlruntime from '@azure-tools/adl.runtime'

// TODO: This command and cmd show store should be subclassing
// the same command which offer a scop and a filter feature
export class verifyConformanceAction extends CommandLineAction {

  public constructor(private ctx: appContext) {
    super({
      actionName: 'verify-conformance',
      summary: 'verifies that an api model is conformant',
      documentation: ''
    });
  }

  protected onExecute(): Promise<void> { // abstract
            return new Promise<void>( () => {
                // TODO: remove and use command args
                const apiModel = this.ctx.store.ApiModels[0];
                const runtime = this.ctx.machineryRuntime;
                const errs = this.ctx.machinery.runConformance(apiModel, adlruntime.ConformanceRuleScope.Api);

                if(errs.length > 0){
                    console.log(`Error Type \tError Message`);
                    //TODO: once field path is wired up, we need to
                    // start printing it

                    errs.forEach(
                        e => {
                            console.log(`${e.errorType}\t${e.errorMessage}`);
                        });
                }

            });
  }

  protected onDefineParameters(): void {
  }
}

