import { CommandLineStringListParameter, CommandLineChoiceParameter, CommandLineAction, CommandLineParser, CommandLineFlagParameter } from '@microsoft/ts-command-line'

// commands
import { showStoreAction } from './cmd_showstore'
import { verifyConformanceAction } from './cmd_verifyconformance'
import { machineryAction } from './cmd_machinery'
import { diffAction } from './cmd_diff'
import { appContext } from './appContext'

import * as adlruntime from '@azure-tools/adl.runtime'

export class adlCliParser extends CommandLineParser {
    private _log_level: CommandLineChoiceParameter;
    private _pre_load_api: CommandLineStringListParameter;
    private _pre_load_runtime: CommandLineStringListParameter;


    // TODO: use  printer that can do json/yaml or just pretty print

  public constructor(private ctx: appContext) {
    super({
      toolFilename: 'cairo',
      toolDescription: ''
    });

            //  pass context down the line
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

        this._pre_load_api = this.defineStringListParameter({
            parameterLongName: '--pre-load-apis',
            description: 'list of apis to preload each is name=<name>+path=<path>',
            argumentName: 'LIST_APIS',
        });

        this._pre_load_runtime = this.defineStringListParameter({
            parameterLongName: '--pre-load-runtimes',
            description: 'list of runtimes to preload each is path=<path> (assumes runtime use default runtime creator type name)',
            argumentName: 'LIST_RUNTIMES',
        });

  }

  protected async onExecute(): Promise<void> {
      // load context
        const ctx = this.ctx;
        // create opts
        ctx.opts = new adlruntime.apiProcessingOptions();

        // wire up log level
        ctx.opts.logger.logLevel = adlruntime.apiProcessingLogLevel[this._log_level.value as string];

        ctx.store = new adlruntime.ApiManager();
        ctx.machinery = new adlruntime.apiMachinery(ctx.opts);

        const loadApis = this._pre_load_api.values
        // typicall there would be a configuration file for cairo
        // where we set the preloaded apis in it. TODO
        if(loadApis.length == 0){
            //TODO: for demo purposes, we are loading a sample
            // in a typical scneario, user will connect to rpaas
            // endpoint to load the data.
            ctx.opts.logger.info(`auto loading sample_rp apis`);
            await ctx.store.addApi(ctx.opts,
                                "sample_rp",
                                "/home/khenidak/go/src/github.com/khenidak/adl/sample_rp" );
        }else{
            // if there are values provided in command line then load from there
            for(const api of loadApis){
                const message = `expected loadable apis to be in form of 'name=<name>+path=<path>'`;

                // no error handling here
                const defParts = api.split("+");
                let apiName:string = "";
                let apiPath:string = "";
                for(const defPart of defParts)
                {
                    const varParts = defPart.split("=");
                    if(varParts.length != 2 || (varParts[0] !== "name" && varParts[0] !=="path")) throw new Error(message);
                    if(varParts[0] == "name")  apiName = varParts[1];
                    if(varParts[0] == "path") apiPath = varParts[1];
                }
                ctx.opts.logger.info(`preloading apis ${apiName} from ${apiPath}`);
                await ctx.store.addApi(ctx.opts, apiName, apiPath);
                ctx.opts.logger.verbose(`loaded apis ${apiName} from ${apiPath}`);
            }
        }

        // loadable runtimes
        const runtimes = this._pre_load_runtime.values;
        const runtimeConfig: any|undefined = undefined; // for now we don't load any configuration TODO
        const creatorTypeName = adlruntime.DEFAULT_RUNTIME_CREATOR_TYPE_NAME; /*for now we assume that all will use default creator name TODO: load from command line*/

        // typicall there would be a configuration file for cairo
        // where we set the preloaded runtimes in it. TODO
        if(runtimes.length == 0){
            //TODO: for demo purposes, we are loading arm runtime
            ctx.opts.logger.info(`auto loading arm runtime`);
            await ctx.machinery.loadRuntime("/home/khenidak/go/src/github.com/khenidak/adl/arm.adl", runtimeConfig, creatorTypeName);
        }else{
            // if there are values provided in command line then load from there
            for(const runtime of runtimes){
                const message = `expected loadable runtime to be in form of 'path=<path>'`;

                // no error handling here
                const defParts = runtime.split("+");
                let runtimePath:string = "";

                for(const defPart of defParts)
                {
                    const varParts = defPart.split("=");
                    if(varParts.length != 2 || (/*varParts[0] !== "creator-name" && */varParts[0] !=="path")) throw new Error(message);
                    if(varParts[0] == "path")  runtimePath = varParts[1];
                    //if(varParts[0] == "path") apiPath = varParts[1];
                }
                ctx.opts.logger.info(`preloading runtime from ${runtimePath}`);
                await ctx.machinery.loadRuntime(runtimePath, runtimeConfig, creatorTypeName);
            }
        }


        this.ctx.machineryRuntime = this.ctx.machinery.createRuntime(this.ctx.store);

        return super.onExecute();
  }
}
