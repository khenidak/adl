import * as adltypes from '@azure-tools/adl.types'

import * as machinerytypes from './machinery.types'
import * as modeltypes from '../model/module'
import * as runtime from  './runtime'

import * as conformance from './conformance/module'
import * as constraints from './constraints/module'


class machineryLoadableRuntime{
	get Name(): string{return this._name;}
	// loaded rules
	conformanceRules: Map<string, machinerytypes.ConformanceRule<modeltypes.AnyAdlModel>> =
		new Map<string, machinerytypes.ConformanceRule<modeltypes.AnyAdlModel>>();

	defaultingConstraints: Map<string, machinerytypes.DefaultingConstraintImpl> =
		new Map<string, machinerytypes.DefaultingConstraintImpl>();

	validationConstraints: Map<string, machinerytypes.ValidationConstraintImpl> =
		new Map<string, machinerytypes.ValidationConstraintImpl>();

	conversionConstraints: Map<string, machinerytypes.ConversionConstraintImpl> =
		new Map<string, machinerytypes.ConversionConstraintImpl>();
	constructor(private _name: string){}
}

export class apiMachinery implements machinerytypes.Machinery{
	private _runtimes = new Map<string, machineryLoadableRuntime>();

	private _defaulting_constraints = new Map<string, machinerytypes.DefaultingConstraintImpl>();
	private _validation_constraints = new Map<string, machinerytypes.ValidationConstraintImpl>();
	private _conversion_constraints = new Map<string, machinerytypes.ConversionConstraintImpl>();
	private registerRuntime(r: machineryLoadableRuntime) : void{
		if(this._runtimes.has(r.Name))
				throw new Error(`runtime ${r.Name} has been already registered`);

		for(let [k,v] of r.defaultingConstraints){
			if(this._defaulting_constraints.has(k))
				throw new Error(`runtime ${r.Name} registering an already registered defaulting constraint ${k}`);

			this._defaulting_constraints.set(k, v);
		}

		for(let [k,v] of r.validationConstraints){
			if(this._validation_constraints.has(k))
				throw new Error(`runtime ${r.Name} registering an already registered validation constraint ${k}`);

			this._validation_constraints.set(k, v);
		}

		for(let [k,v] of r.conversionConstraints){
			if(this._conversion_constraints.has(k))
				throw new Error(`runtime ${r.Name} registering an already registered conversion constraint ${k}`);

			this._conversion_constraints.set(k,v);
		}

		this._runtimes.set(r.Name, r);
	}

	// !!!! IMPORTANT: adl runtime is treated the same way as the rest of the run time.
	// the only difference is it is loaded here. that means any additional constraints
	// rules needs to be manually added here
	private buildAdlRuntime(){
		// load the runtime
		const adlcore = new machineryLoadableRuntime(machinerytypes.ADL_RUNTIME_NAME);

		// conformance rules
		const rule1 = new conformance.enforceLowerCamelCase();
		adlcore.conformanceRules.set(rule1.Name, rule1);

		// all names has to reference the Constraint Types' Names

		const def1 = new constraints.DefaultValueImpl();
		adlcore.defaultingConstraints.set("DefaultValue", def1);

		const val1 = new constraints.MaximumImpl();
		adlcore.validationConstraints.set("Maximum", val1);

		const val2 = new constraints.MinimumImpl();
		adlcore.validationConstraints.set("Minimum", val2);

		const val3 = new constraints.RangeImpl();
		adlcore.validationConstraints.set("Range", val3);

		const conv1 = new constraints.MapToImpl();
		adlcore.conversionConstraints.set("MapTo", conv1);

		return adlcore;
	}

	constructor(){
			const coreRuntime = this.buildAdlRuntime();
			this.registerRuntime(coreRuntime);
	}

	getDefaultingConstraintImplementation(name: string): machinerytypes.DefaultingConstraintImpl{
		const impl = this._defaulting_constraints.get(name);
		if(!impl) throw new Error(`defaulting constraint ${name} does not exist`);

		return impl;
	}

	getValidationConstraintImplementation(name: string): machinerytypes.ValidationConstraintImpl{
		const impl = this._validation_constraints.get(name);
		if(!impl) throw new Error(`validation constraint ${name} does not exist`);

		return impl;
	}

	getConversionConstraintImplementation(name: string): machinerytypes.ConversionConstraintImpl{
		const impl = this._conversion_constraints.get(name);
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

	// create runtime for an entire store
	createRuntime(store: modeltypes.ApiManager, options: modeltypes.apiProcessingOptions): machinerytypes.ApiRuntime{
		return new runtime.apiRuntime(store,this, options);
	}
}
