import { CommandLineAction, CommandLineStringParameter, CommandLineChoiceParameter } from '@microsoft/ts-command-line'
import { appContext } from './appContext'
import * as adltypes from '@azure-tools/adl.types'


export class machinery_generator_Action extends CommandLineAction {
    private _machineActionName: CommandLineChoiceParameter;
    private _generator_name: CommandLineStringParameter;
    private _config: CommandLineStringParameter;


    public constructor(private ctx: appContext) {
        //TODO docs need new line
        super({
            actionName: 'generators',
            summary: 'interacts with machinery generators',
            documentation:  ``,
        });
    }

    private validateArgs(): void{
        switch(this._machineActionName.value){
            case "list":{
                /*no op*/
                break;
            }

            case "run":{
               if(this._generator_name.value == undefined)
                    throw new Error(`expected ${this._generator_name.longName} value`);

                break;
            }
        }
    }

    private list(){
        const machinery = this.ctx.machinery
        const generators = machinery.getGenerators();
        for(const [k,v] of generators){
            console.log(`Generator: ${k}`);
            console.log(`${v.description}`);
            console.log(``);
        }
        return;
    }

    private runGenerator(){
        const generator_name = this._generator_name.value as string;
        const config = this._config.value;
        const machinery = this.ctx.machinery
        machinery.runGeneratorFor(this.ctx.store, generator_name, config);
    }

    protected onExecute(): Promise<void> { // abstract
        return new Promise<void>( () => {
            const runtime = this.ctx.machineryRuntime;
            const errors = new adltypes.errorList();

            this.validateArgs();

            switch(this._machineActionName.value){
                case "list":{
                    this.list();
                    break;
                }

                case "run":{
                    this.runGenerator();
                    break;
                }
            }
        });
    }
    // ts-command-line does not like it supports chained/catogry commands
    // e.g something category action.
    // so we have to resort to this ugliness
    // TODO: would be nice to have read from std in here..
    protected onDefineParameters(): void {
        this._machineActionName = this.defineChoiceParameter({
            parameterLongName: '--action',
            parameterShortName: '-a',
    // should we add validation and defaulting here here? runtime supports
            alternatives: [ 'list', 'run' ],
            defaultValue: 'list',
            description: 'lists the actions that you can run on generators',
            required: false,
        });

        this._generator_name = this.defineStringParameter({
            parameterLongName: '--generator-name',
            argumentName: 'GENERATOR_NAME',
            parameterShortName: '-n',
            description: 'source file/content',
            required: false,
        });

        this._config = this.defineStringParameter({
            parameterLongName: '--config',
            argumentName: 'CONFIG',
            parameterShortName: '-c',
            description: 'generator config',
            required: false,
        });
    }
}
