import {  resolve } from 'path';
import fs from 'fs';

import { CommandLineAction, CommandLineStringParameter, CommandLineChoiceParameter } from '@microsoft/ts-command-line'
import { appContext } from './appContext'
import * as cliutils from './utils'

import * as adltypes from '@azure-tools/adl.types'
/* shows what is in store
 * in a runtime env, this will connect to rpaas api server
 * and use it as a store, to red api definitions from
 */
//TODO: findout of we can change this  to
// cli machinery convert
// instead of
// cli machinery --action=convert


export class machineryAction extends CommandLineAction {
    private _machineActionName: CommandLineChoiceParameter;
    private _source: CommandLineStringParameter;
    private _apiName: CommandLineStringParameter;
    private _normalizedApiTypeName: CommandLineStringParameter;

    private _apiVersion: CommandLineStringParameter;
    private _versionedApiTypeName : CommandLineStringParameter;

    private _targetApiVersion: CommandLineStringParameter;
    private _targetVersionedApiTypeName: CommandLineStringParameter;

    public constructor(private ctx: appContext) {
        //TODO docs need new line
        super({
            actionName: 'machinery',
            summary: 'run a machinery command such as conversion or normalization',
            documentation:  `runs a machinery command as stated --action parameter`,
        });
    }

    private validateArgs(): void{
        switch(this._machineActionName.value){
            case "create-normalized-instance":{
                if(this._normalizedApiTypeName.value == undefined)
                // we need to convert these to adl errors
                    throw new Error(`expected ${this._normalizedApiTypeName.longName} value`);

                break;
            }

            case "create-versioned-instance":{
                if(this._apiVersion.value == undefined)
                    throw new Error(`expected ${this._apiVersion.longName} value`);

                if(this._versionedApiTypeName.value == undefined)
                    throw new Error(`expected ${this._versionedApiTypeName.longName} value`);

                break;
            }

            case "normalize":{
                if(this._apiVersion.value == undefined)
                    throw new Error(`expected ${this._apiVersion.longName} value`);

                if(this._versionedApiTypeName.value == undefined)
                    throw new Error(`expected ${this._versionedApiTypeName.longName} value`);

                if(this._source.value == undefined)
                    throw new Error(`expected ${this._source.longName} value`);

                break;
            }

            case "denormalize":{
                    if(this._targetApiVersion.value == undefined)
                    throw new Error(`expected ${this._targetApiVersion.longName} value`);

                if(this._targetVersionedApiTypeName.value == undefined)
                    throw new Error(`expected ${this._targetVersionedApiTypeName.longName} value`);

                if(this._source.value == undefined)
                    throw new Error(`expected ${this._source.longName} value`);

                break;
            }

            case "convert":{
                if(this._apiVersion.value == undefined)
                    throw new Error(`expected ${this._apiVersion.longName} value`);

                if(this._versionedApiTypeName.value == undefined)
                    throw new Error(`expected ${this._versionedApiTypeName.longName} value`);

                    if(this._targetApiVersion.value == undefined)
                    throw new Error(`expected ${this._targetApiVersion.longName} value`);

                if(this._targetVersionedApiTypeName.value == undefined)
                    throw new Error(`expected ${this._targetVersionedApiTypeName.longName} value`);

                if(this._source.value == undefined)
                    throw new Error(`expected ${this._source.longName} value`);

                break;
            }

        }
    }

    private createVersionedInstance(){
        const runtime = this.ctx.machineryRuntime;
        const errors = new adltypes.errorList();

        const apiName = this._apiName.value as string;
        const versionName = this._apiVersion.value as string;
        const versionedApiTypeName = this._versionedApiTypeName.value as string;

        const versioned = runtime.create_versioned_instance(apiName, versionName, versionedApiTypeName);
        console.log(JSON.stringify(versioned));/*TODO printers*/

        return;
    }

    private createNormalizedInstance(){
        const runtime = this.ctx.machineryRuntime;
        const errors = new adltypes.errorList();

        const apiName = this._apiName.value as string;
        const normalizedApiTypeName = this._normalizedApiTypeName.value as string;

        const normalized = runtime.create_normalized_instance(apiName, normalizedApiTypeName);
        console.log(JSON.stringify(normalized));/*TODO printers*/
    }

    //  if s is path, it returns the file in path
    // if not, s is returned
    private getFromSource(s:string): string {
        if(resolve(s)){
            return fs.readFileSync(s).toString();
        }
        return s;
    }

    private normalize(){
        const runtime = this.ctx.machineryRuntime;
        const errors = new adltypes.errorList();

        const apiName = this._apiName.value as string;
        const versionName = this._apiVersion.value as string;
        const versionedApiTypeName = this._versionedApiTypeName.value as string;
        const source = this._source.value as string;

        const versionedTyped = JSON.parse(this.getFromSource(source));
        if(!versionedTyped)
            throw new Error(`failed to read data from ${source}`)

        const normalized = runtime.normalize(versionedTyped, apiName, versionName, versionedApiTypeName, errors);
        cliutils.printResultOrError(this.ctx, normalized, errors, true /*exit*/);
    }

    private denormalize(){
        const runtime = this.ctx.machineryRuntime;
        const errors = new adltypes.errorList();

        const apiName = this._apiName.value as string;
        const tgtVersionName = this._targetApiVersion.value as string;
        const tgtversionedApiTypeName = this._targetVersionedApiTypeName.value as string;
        const source = this._source.value as string;

        const normalizedTyped = JSON.parse(this.getFromSource(source));
        if(!normalizedTyped)
            throw new Error(`failed to read data from ${source}`)

        const versioned = runtime.denormalize(normalizedTyped, apiName, tgtVersionName, tgtversionedApiTypeName, errors);
        cliutils.printResultOrError(this.ctx, versioned, errors, true /*exit*/);
    }

    private convert(){
        const runtime = this.ctx.machineryRuntime;
        const errors = new adltypes.errorList();

        const apiName = this._apiName.value as string;

        const versionName = this._apiVersion.value as string;
        const versionedApiTypeName = this._versionedApiTypeName.value as string;

        const tgtVersionName = this._targetApiVersion.value as string;
        const tgtversionedApiTypeName = this._targetVersionedApiTypeName.value as string;

        const source = this._source.value as string;

        const srcVersionedTyped = JSON.parse(this.getFromSource(source));
        if(!srcVersionedTyped)
            throw new Error(`failed to read data from ${source}`);

        const tgtversioned = runtime.convert(srcVersionedTyped, apiName, versionName, versionedApiTypeName, tgtVersionName, tgtversionedApiTypeName ,errors);
        cliutils.printResultOrError(this.ctx, tgtversioned, errors, true /*exit*/);
    }

    protected onExecute(): Promise<void> { // abstract
        return new Promise<void>( () => {
            const runtime = this.ctx.machineryRuntime;
            const errors = new adltypes.errorList();

            this.validateArgs();

            switch(this._machineActionName.value){
                case "create-normalized-instance":{
                    this.createNormalizedInstance();
                    break;
                }

                case "create-versioned-instance":{
                    this.createVersionedInstance();
                    break;
                }

                case "normalize":{
                    this.normalize();
                    break;
                }

                case "denormalize":{
                    this.denormalize();
                    break;
                }

                case "convert":{
                    this.convert();
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
            alternatives: [ 'normalize', 'denormalize', 'convert', 'create-normalized-instance', 'create-versioned-instance' ],
            defaultValue: 'normalize',
            description: 'action to for the machinery to run',
            required: false,
        });

        this._source = this.defineStringParameter({
            parameterLongName: '--source',
            argumentName: 'PATH_STRING_STDIN',
            parameterShortName: '-s',
            description: 'source file/content',
            required: false,
        });

        this._apiName = this.defineStringParameter({
            parameterLongName: '--api-name',
            argumentName: 'MY_API_NAME',
            parameterShortName: '-n',
            description: 'api name',
            required: true,
        });

    this._normalizedApiTypeName = this.defineStringParameter({
            parameterLongName: '--normalized-api-type-name',
            argumentName: 'NORMALIZED_API_TYPE_NAME',
            parameterShortName: '-r',
            description: 'api name',
            required: false,
        });

    this._apiVersion = this.defineStringParameter({
            parameterLongName: '--api-version',
            argumentName: 'API_VERSION',
            parameterShortName: '-v',
            description: 'api version',
            required: false,
        });

        this._versionedApiTypeName = this.defineStringParameter({
            parameterLongName: '--versioned-api-type-name',
            argumentName: 'VERSIONED_API_TYPE_NAME',
            parameterShortName: '-i',
            description: 'versioned api type name',
            required: false,
        });


        this._targetApiVersion = this.defineStringParameter({
            parameterLongName: '--target-api-version',
            argumentName: 'TARGET_API_VERSION',
            parameterShortName: '-t',
            description: 'target api version (mandatory in case of conversion)',
            required: false,
        });

        this._targetVersionedApiTypeName = this.defineStringParameter({
            parameterLongName: '--target-versioned-api-type-name',
            argumentName: 'TARGET_API_TYPE_NAME',
            parameterShortName: '-e',
            description: 'target api versioned type name (mandatory in case of conversion)',
            required: false,
        });


    }
}
