import { CommandLineAction, CommandLineParser, CommandLineFlagParameter, CommandLineStringParameter } from '@microsoft/ts-command-line'
import { appContext } from './appContext'

import * as adlruntime from '@azure-tools/adl.runtime'
import * as adltypes from '@azure-tools/adl.types'


// TODO: This command and cmd show store should be subclassing
// the same command which offer a scop and a filter feature
export class verifyConformanceAction extends CommandLineAction {
  private _rulegroup: CommandLineStringParameter;
  public constructor(private ctx: appContext) {
    super({
      actionName: 'run-conformance',
      summary: 'verifies that an api model is conformant',
      documentation: ''
    });
  }

  protected onExecute(): Promise<void> { // abstract
            return new Promise<void>( () => {
                const runtime = this.ctx.machineryRuntime;
                const groupName = this._rulegroup.value == undefined ? "" : (this._rulegroup.value as string)
                /* for demo purposes, we just work with versioned types
                 * TODO: we need a cli param for scope and filter
                 * then we loop through models' object model trying to match scope, and filter
                 */
                let all_errors = new adltypes.errorList();

                for(const model of this.ctx.store.ApiModels){
                    for(const versions of model.Versions){
                        for(const versionedApiType of versions.VersionedTypes){
                            const errs = this.ctx.machinery.runConformance(versionedApiType, adlruntime.ConformanceRuleScope.VersionedApiType, groupName);
                            all_errors = all_errors.concat(errs);
                        }
                    }
                }

            if(all_errors.length > 0){
                console.log(`Error Type \tError Message\t Field`);
                for(const err of all_errors){
                    const versioned_error = this.ctx.machinery.convertToVersioendError(err, "adl-v1");
                    console.log(`${versioned_error.errorType}\t${versioned_error.errorMessage}\t${versioned_error.fieldPath}`);
                }
             }
            });
  }

  protected onDefineParameters(): void {
    this._rulegroup = this.defineStringParameter({
      parameterLongName: '--group',
      argumentName: 'PATH_STRING_STDIN',
      parameterShortName: '-g',
      description: 'rule group name',
      required: false,
    });


  }
}

