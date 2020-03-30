import { IndentationText, QuoteKind, Project } from 'ts-morph';
import {  resolve, relative } from 'path';
import { readFile, isDirectory, isFile} from '@azure-tools/async-io';

import * as adltypes from '@azure-tools/adl.types';
import * as helpers from './helpers';
import { api_model } from './apiModel';

// Model types
// an arbitrary type that supports loading with success failure returns
export interface loadableObject{
    load(options:apiProcessingOptions, errors: adltypes.errorList): boolean
}

// represents a single api model. That consists of
// normalized types.
// versiones. each consists of many versioned types
export interface ApiModel{
    readonly Name: string;
    readonly Versions: Iterable<ApiVersionModel>;
    readonly NormalizedTypes: Iterable<NormalizedApiTypeModel>;

    hasNormalizedApiType(normalizedApiTypeName: string):boolean;
    getNormalizedApiType(normalizedApiTypeName: string): NormalizedApiTypeModel | undefined

    getVersion(name: string): ApiVersionModel | undefined;
    hasVersion(name: string): boolean;

    hasVersioner(name: string): boolean;
    hasNormalizer(name: string): boolean;

    // returns instance of a type in the loaded spec
    createSpecInstance(name:string): any | undefined;
}


// represents an api version.
export interface ApiVersionModel extends loadableObject{
    readonly Name: string;
    readonly ModuleName: string;
    readonly VersionedTypes: Iterable<VersionedApiTypeModel>;
    getVersionedType(name: string): VersionedApiTypeModel | undefined;
}

// represents an api type be it versioned or normalized
export interface ApiTypeModel extends loadableObject{
    readonly Name: string;
    readonly Properties: Iterable<ApiTypePropertyModel>;
    readonly Constraints:Array<ConstraintModel>;

    getProperty(propertyName: string): ApiTypePropertyModel | undefined;

}


// repsents an normalized (unversioned) api type
export interface NormalizedApiTypeModel extends  ApiTypeModel{
    readonly NormalizerName:string;
}


export interface VersionedApiTypeModel extends ApiTypeModel{
    readonly NormalizedApiTypeName:string;
    readonly VersionerName: string;
}

export interface ConstraintModel{
    readonly Name:string;
    readonly Arguments: Array<any>;
}
export enum PropertyDataTypeKind{
    Complex      = "Complex",
    ComplexArray = "ComplexArray",
    ScalarArray  = "ScalarArray",
    Scalar       = "Scalar",
}


export interface ApiTypePropertyModel extends loadableObject{
    readonly Name: string;
    // primitive data type name or complex type name
    // eg
    // `name: string` // will report string
    // `address: AddressClass` // will report address class
    // alias data type are decomposed to thier basic types
    // example: suppose a data type defined as export type int32 = number & DataType<"int32">;
    // doctorWhoHeartCount: int32;// will report number.
    readonly DataTypeName: string;
    // property no longer exist on apitype
    readonly isRemoved: boolean;
    // all constraints defined on properties
    readonly Constraints: Array<ConstraintModel>;
    // all constraints defined on array element if the property type is array
    readonly ArrayElementConstraints: Array<ConstraintModel>;
    // all shapes of data type: one of Complex, Scalar, ComplexArray, ScalarArray
    readonly DataTypeKind: PropertyDataTypeKind;
    // property is optional
    readonly isOptional: boolean;
    // returns the complex data type for property if available;
    readonly ComplexDataType: ApiTypeModel;
    // don't run auto conversion on type
    readonly isManaullyConverted: boolean;
    // returns true if the type is aliased via DataType<Name>;
    readonly isAliasDataType: boolean
    // returns the alias name
    readonly AliasDataTypeName: string;
    // returns true if the property is defined as enum
    readonly isEnum: boolean;
    // returns the list of possible enum values.
    // empty if it is not of type enum;
    readonly EnumValues: any[];

    getDefaultingConstraints(): Array<ConstraintModel>;
    getValidationConstraints(): Array<ConstraintModel>;
    getConversionConstraints(): Array<ConstraintModel>;

    getArrayElementValidationConstraints():Array<ConstraintModel>;

    isArray(): boolean;
}


// type guards
export type AnyAdlModel = ApiModel |  NormalizedApiTypeModel | ApiVersionModel | VersionedApiTypeModel | ApiTypeModel | ApiTypePropertyModel;
export function isApiModel(model: AnyAdlModel): model is ApiModel { return (model as ApiModel).NormalizedTypes !== undefined;}
export function isNormalizedApiTypeModel(model: AnyAdlModel): model is NormalizedApiTypeModel { return (model as NormalizedApiTypeModel).NormalizerName !== undefined;}
export function isApiVersionModel(model: AnyAdlModel): model is ApiVersionModel { return (model as ApiVersionModel).VersionedTypes !== undefined;}
export function isVersionedApiTypeModel(model: AnyAdlModel): model is VersionedApiTypeModel { return (model as VersionedApiTypeModel).NormalizedApiTypeName !== undefined;}
export function isApiTypeModel(model: AnyAdlModel): model is ApiTypeModel { return isNormalizedApiTypeModel(model) || isApiVersionModel(model)};
export function isApiTypePropertyModel(model: AnyAdlModel): model is ApiTypePropertyModel{ return (model as ApiTypePropertyModel).Constraints !== undefined;}

// api manager - aka store

const manipulationSettings = {
 indentationText: IndentationText.TwoSpaces,
 insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
 quoteKind: QuoteKind.Single,
};

function parseJsonc(text: string) {
    return JSON.parse(text.replace(/\/\*[\s\S]*?\*\//gm, '')
        .replace(/\s+\/\/.*/g, '')
        .replace(/],(\s*?)\}/gm, ']$1}')
        .replace(/},(\s*?)\}/gm, '}$1}'));
}



export class ApiManager {
    private _apiModels = new Map<string, ApiModel>();

    get ApiModels(): Iterable<ApiModel> {
        var infos = new Array<ApiModel>();

        for(let [k,v] of this._apiModels)
            infos.push(v);

        return infos;
    }

    hasApiInfo(name: string): boolean{
        return this._apiModels.has(name);
    }

    getApiInfo(name: string): ApiModel | undefined{
        return this._apiModels.get(name);
    }

 constructor() {}


    async addApi(options:apiProcessingOptions, apiName: string, projectDirectory: string): Promise<adltypes.errorList>{
        const errors = new adltypes.errorList();

        const apiModel = await this.loadApi(options, errors, apiName, projectDirectory);

        // an error during load?
        if(!apiModel) return errors;

        this._apiModels.set(apiName, apiModel);
        return errors;
    }

    async loadApi(options: apiProcessingOptions, errors:adltypes.errorList, apiName: string, projectDirectory: string): Promise<ApiModel | undefined> {
        projectDirectory = resolve(projectDirectory);

        if (!isDirectory(projectDirectory)){
            const e = helpers.createLoadError(`Invalid Path ${projectDirectory} for ADL project`);
            errors.push(e);
            return undefined;
            }

        const configFile = resolve(projectDirectory, 'tsconfig.json');
            if (!isFile(configFile)) {
            const e = helpers.createLoadError(`No tsconfig at ${configFile}`);
            errors.push(e);
            return undefined;
        }

        const pkgFile = resolve(projectDirectory, 'package.json');
  if (!isFile(pkgFile)) {
                const e = helpers.createLoadError(`No packagejson at ${pkgFile}`);
                errors.push(e);
                return undefined;
        }

        const project = new Project({ tsConfigFilePath: configFile, manipulationSettings });
        const loadedFiles = new Set<string>();

        // create the api info
  for (const each of project.getSourceFiles()) {
            const sourceFile = each.getFilePath();
   const content = await readFile(sourceFile);
   const rPath = relative(projectDirectory, sourceFile);
   loadedFiles.add(rPath);
   project.createSourceFile(rPath, content);
  }

        const apiModel = new api_model(apiName, projectDirectory, project, loadedFiles);

        apiModel.tsconfig = parseJsonc((await readFile(configFile)));
        apiModel.package = parseJsonc((await readFile(pkgFile)));

        const loaded = await apiModel.load(options, errors);
        if(!loaded) return undefined;

        return apiModel;
    }
}


export enum apiProcessingLogLevel{
    none,
    err,
    warn,
    info,
    verbose,
}

// TODO: move to package level types
// logger
export interface apiProcessingLogger{
    info(s: string):void
    wrn(s:string): void
    err(s:string): void
    verbose(s:string): void
    logLevel:apiProcessingLogLevel;
}

class apiProcessingConsoleLogger implements apiProcessingLogger{
    private levelName: string;
    private levelNamePrefix: string;
    private l:apiProcessingLogLevel;
    get logLevel(){ return this.l;}
    set logLevel(val: apiProcessingLogLevel){
        this.l = val;
        this.levelName = apiProcessingLogLevel[this.l];
        this.levelNamePrefix = this.levelName.charAt(0).toUpperCase();
        this.verbose(`console logger has changed its log level to (${this.levelName})`);
    }

    constructor(level:apiProcessingLogLevel){
        this.logLevel = level;
    }
    private log(target_level: apiProcessingLogLevel, s:string):void{
        if(target_level <= this.l)
            console.log("",`${this.levelNamePrefix}: ${s}`);
    }
    info(s: string): void { this.log(apiProcessingLogLevel.info, s);}
    wrn(s:string): void{ this.log(apiProcessingLogLevel.warn, s);}
    err(s:string): void{ this.log(apiProcessingLogLevel.err, s);}
    verbose(s:string): void{ this.log(apiProcessingLogLevel.verbose,s);}
}

// ApiLoadOptions logger, log level and other
// settings used in processing (validation, loading etc).
export class apiProcessingOptions{
        // default log level none
        private _logLevel: apiProcessingLogLevel = apiProcessingLogLevel.info;
        private _logger: apiProcessingLogger;

        constructor()
        constructor(logLevel?: apiProcessingLogLevel)
        constructor(logLevel?: apiProcessingLogLevel, logger?:apiProcessingLogger){
            if(logLevel)
                this._logLevel = logLevel;

            if(logger){
                this._logger = logger
                return;
            }

            this._logger = new apiProcessingConsoleLogger(this._logLevel);
        }

        get logger(): apiProcessingLogger{
            return this._logger;
        }
}
