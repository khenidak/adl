import * as adltypes from '@azure-tools/adl.types'

import * as machinerytypes from './machinery.types'
import * as modeltypes from '../model/module'
import * as runtime from  './runtime'

import * as conformance from './conformance/module'
import * as constraints from './constraints/module'

import { api_manager } from './apimanager'

export class api_machinery implements machinerytypes.ApiMachinery{
    private _runtimes = new Map<string, machinerytypes.machineryLoadableRuntime>();

    private _defaulting_implementations = new Map<string, machinerytypes.DefaultingConstraintImpl>();
    private _validation_implementations = new Map<string, machinerytypes.ValidationConstraintImpl>();
    private _conversion_implementations = new Map<string, machinerytypes.ConversionConstraintImpl>();

    private _generators = new Map<string, machinerytypes.Generator>();

    private registerRuntime(r: machinerytypes.machineryLoadableRuntime) : void{
        if(this._runtimes.has(r.Name))
                throw new Error(`runtime ${r.Name} has been already registered`);

        for(let [k,v] of r.defaultingImplementations){
            if(this._defaulting_implementations.has(k))
                throw new Error(`runtime ${r.Name} registering an already registered defaulting constraint ${k}`);

            this._defaulting_implementations.set(k, v);
        }

        for(let [k,v] of r.validationImplementations){
            if(this._validation_implementations.has(k))
                throw new Error(`runtime ${r.Name} registering an already registered validation constraint ${k}`);

            this._validation_implementations.set(k, v);
        }

        for(let [k,v] of r.conversionImplementations){
            if(this._conversion_implementations.has(k))
                throw new Error(`runtime ${r.Name} registering an already registered conversion constraint ${k}`);

            this._conversion_implementations.set(k,v);
        }

        for(let [k,v] of r.generators){
            if(this._generators.has(k))
                throw new Error(`runtime ${r.Name} registering an already registered generator ${k}`);

            this._generators.set(k,v);
        }

        this._runtimes.set(r.Name, r);
        this.opts.logger.info(`adl machinery registered runtime: ${r.Name}`);
    }

    // !!!! IMPORTANT: adl runtime is treated the same way as the rest of the run time.
    // the only difference is it is loaded here. that means any additional constraints
    // rules needs to be manually added here
    private buildAdlRuntime(){
        // load the runtime
        const adlcore = new machinerytypes.machineryLoadableRuntime(machinerytypes.ADL_RUNTIME_NAME);

        // conformance rules
        const rule1 = new conformance.enforceLowerCamelCase();
        adlcore.conformanceRules.set(rule1.Name, rule1);

        // all names has to reference the Constraint Types' Names

        const def1i = new constraints.DefaultValueImpl();
        adlcore.defaultingImplementations.set("DefaultValue", def1i);

        const val1i = new constraints.MaximumImpl();
        adlcore.validationImplementations.set("Maximum", val1i);

        const val2i = new constraints.MinimumImpl();
        adlcore.validationImplementations.set("Minimum", val2i);

        const val3i = new constraints.RangeImpl();
        adlcore.validationImplementations.set("Range", val3i);

        const conv1i = new constraints.MapToImpl();
        adlcore.conversionImplementations.set("MapTo", conv1i);

        return adlcore;
    }

    constructor(private opts: modeltypes.apiProcessingOptions){
            // load core runtime
            const coreRuntime = this.buildAdlRuntime();
            this.registerRuntime(coreRuntime);
    }

    // loads an external runtime
    async loadRuntime(runtimePath: string, config:any | undefined, runtimeCreatorTypeName: string = machinerytypes.DEFAULT_RUNTIME_CREATOR_TYPE_NAME):Promise<void>{
       const loaded = await import(runtimePath);
       if(loaded[runtimeCreatorTypeName] == undefined) throw new Error(`failed to load runtime from :${runtimePath} can not find runtime creator with the name ${runtimeCreatorTypeName}`);

       const creator = new loaded[runtimeCreatorTypeName]() as machinerytypes.RuntimeCreator;

       if(!machinerytypes.isRuntimeCreator(creator)) throw new Error(`failed to load runtime from :${runtimePath} type ${runtimeCreatorTypeName} is not a runtime creator`);

       const runtimeDef = creator.Create(config);
       this.registerRuntime(runtimeDef);
    }

    getDefaultingConstraintImplementation(name: string): machinerytypes.DefaultingConstraintImpl{
        const impl = this._defaulting_implementations.get(name);
        if(!impl) throw new Error(`defaulting constraint ${name} does not exist`);

        return impl;
    }

    getValidationConstraintImplementation(name: string): machinerytypes.ValidationConstraintImpl{
        const impl = this._validation_implementations.get(name);
        if(!impl) throw new Error(`validation constraint ${name} does not exist`);

        return impl;
    }

    getConversionConstraintImplementation(name: string): machinerytypes.ConversionConstraintImpl{
        const impl = this._conversion_implementations.get(name);
        if(!impl) throw new Error(`conversion constraint ${name} does not exist`);

        return impl;
    }

    // TODO: this needs revising
    private conformanceError_to_adlerror(e: machinerytypes.ConformanceError): adltypes.error{
        const err = new adltypes.error();
        err.errorMessage = e.Message;
        err.errorType= "conformance";

        let name = "/properties/" + e.TypePropertyName;
        if(e.NormalizedTypeName){
            name = `/normalizedtypes/${e.NormalizedTypeName}${name}`;
        }else{
            name = `/versionedtypes/${e.VersionedTypeName}{$name}`;
        }
        if(e.VersionName){
            name = `/versions/${e.VersionName}${name}`;
        }else{
            name = `/versions/*${name}`;
        }
        /*TODO LINK ERROR WARN/ERROR ONCE ADL HAS ERROR LEVEL*/
        err.field = {
            index :-1,
            parent: undefined,
            path: name,
            name: name,
        }
        return err;
    }

    runConformance(model: modeltypes.AnyAdlModel, scope: machinerytypes.ConformanceRuleScope /* todo other filering args*/): adltypes.errorList{
        const errs = new adltypes.errorList();
        for(let [runtimeName, runtime] of this._runtimes){
            for( let [ruleName, rule] of runtime.conformanceRules){
                if(rule.Scope !== (scope & rule.Scope)) continue;
                    const conformanceErrors = rule.RunRule(model);
                    for(let err  of conformanceErrors){
                        err.RuleName = rule.Name;
                        err.Group = rule.Group;
                        err.OwnerRuntime = runtime.Name;
                        err.Scope = (err.Scope) ? err.Scope :  rule.Scope;
                        err.Kind = (err.Kind) ? err.Kind : rule.Kind;
                        err.Message = (err.Message) ? err.Message : `unconformant: conformance rule ${err.RuleName} failed`;

                        err.ModelName = (err.ModelName) ? err.ModelName : (modeltypes.isApiModel(model) ? model.Name : undefined);
                        err.VersionName = (err.VersionName) ? err.VersionName : (modeltypes.isApiVersionModel(model) ? model.Name : undefined);
                        err.NormalizedTypeName = (err.NormalizedTypeName) ? err.NormalizedTypeName : (modeltypes.isNormalizedApiTypeModel(model) ? model.Name : undefined);
                        err.VersionedTypeName = (err.VersionedTypeName) ? err.VersionedTypeName : (modeltypes.isVersionedApiTypeModel(model) ? model.Name : undefined);
                        err.TypePropertyName = (err.TypePropertyName) ? err.TypePropertyName : (modeltypes.isApiTypePropertyModel(model) ? model.Name: undefined);

                        errs.push(this.conformanceError_to_adlerror(err));
                    }
                }
            }

        // convert errors;
        return errs;
    }

    // generators
    getGenerators(): Map<string, machinerytypes.Generator>{
        return this._generators;
    }

    hasGenerator(name: string): boolean{
       return this._generators.has(name);
    }

    runGeneratorFor(apiManager: machinerytypes.ApiManager, name:string, config: any | undefined):void{
        if(!this.hasGenerator(name)) throw new Error(`generator ${name} does not exist`);

        const generator = this._generators.get(name) as machinerytypes.Generator;

        generator.generate(apiManager, this.opts, config);
    }

    // create runtime for an entire store
    createRuntime(store: machinerytypes.ApiManager): machinerytypes.ApiRuntime{
        return new runtime.apiRuntime(store,this, this.opts);
    }

    createApiManager(): machinerytypes.ApiManager{
        return new api_manager(this);
    }
}
