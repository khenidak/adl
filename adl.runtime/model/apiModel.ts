import { Project, SourceFile, TypeReferenceNode } from 'ts-morph';

import * as adltypes from '@azure-tools/adl.types';
import * as modeltypes from './model.types';
import * as helpers from './helpers'

import { api_version } from './apiVersion';
import { normalized_type } from './apiType'

// ApiInfo is a service definition.. an RP/
export class api_model implements modeltypes.ApiModel{
	//TODO move to private
  tsconfig = helpers.defaults.tsconfig;
	package = helpers.defaults.package;

	private _apiVersionModels = new Map<string, modeltypes.ApiVersionModel>();
	private _normalizedTypes = new Map<string, modeltypes.NormalizedApiTypeModel>();
	private _imported:any | undefined; // loaded/compiled

	get Name(){ return this.name;}

	get Versions(): Iterable<modeltypes.ApiVersionModel> {
		var infos = new Array<modeltypes.ApiVersionModel>();

		for(let [k,v] of this._apiVersionModels)
			infos.push(v);

		return infos;
	}

	get NormalizedTypes():Iterable<modeltypes.NormalizedApiTypeModel>{
		var infos = new Array<modeltypes.NormalizedApiTypeModel>();
		for(let [k,v] of this._normalizedTypes)
		infos.push(v);

		return infos;
	}

	constructor(private name:string, private rootPath: string, private project:Project, private loadedFiles: Set<string>){}

	getVersion(name: string): modeltypes.ApiVersionModel | undefined{
		return this._apiVersionModels.get(name);
	}

	hasVersion(name: string): boolean{
		return this._apiVersionModels.has(name);
	};

	getNormalizedApiType(normalizedApiTypeName: string): modeltypes.NormalizedApiTypeModel | undefined{
		return this._normalizedTypes.get(normalizedApiTypeName);
	}

	hasNormalizedApiType(normalizedApiTypeName: string):boolean{
		return this._normalizedTypes.get(normalizedApiTypeName) != undefined;
	}

	hasVersioner(name: string): boolean{
		if(this._imported == undefined) throw new Error("attempt was made to interact wth loadable spec before it finishes loading");
			return this._imported[name] != undefined;
	}

	hasNormalizer(name: string): boolean{
		if(this._imported == undefined) throw new Error("attempt was made to interact wth loadable spec before it finishes loading");
			return this._imported[name] != undefined;
	}

	createSpecInstance(name:string): any | undefined{
			if(!this.hasVersioner(name)) return undefined;
			return new this._imported[name]();
	}

	private async loadVersions(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList, mainFile: SourceFile): Promise<boolean>{
		// load versions from main file
		const typeAliases = mainFile.getTypeAliases().filter(ta => ta.isExported());
		let result = true;

		typeAliases.forEach(
			ta => {
					const typeNode = ta.getTypeNode();
					if(!typeNode){
							const message = `api-version: ${ta.getName()} failed to load. failed to read typeNode`;
							errors.push(helpers.createLoadError(message))
							options.logger.err(message);
							result = false;
							return;
					}

					const tp: helpers.typer = new helpers.typer(typeNode);
					const versionModel: api_version = new api_version(this.project, this.rootPath, tp, this);
					const loaded = versionModel.load(options, errors);

					if(!loaded) {
						options.logger.err(`api-version: ${ta.getName()} failed to load. check load errors`);
						result =  false;
						return;
					}

					if(this._apiVersionModels.has(versionModel.Name)) {
						options.logger.err(`api-version: ${ta.getName()}/${versionModel.Name} has a duplicate name`);
						result = false;
						return;
					}

					this._apiVersionModels.set(versionModel.Name, versionModel);
			});

		return result;
	}

	private async loadNormalizedTypeInfos(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): Promise<boolean>{
		const normalizedModulePath = this.rootPath + "/" + "normalized/module.ts";
		const normalizedTypesModule = this.project.getSourceFile(normalizedModulePath);

		if(!normalizedTypesModule){
				const message:string = `can not load normalized types module file ${normalizedModulePath}`;
				options.logger.wrn(message);
				const e = helpers.createLoadError(message);
				errors.push(e);
				return false;
			}

		var typeAliases = normalizedTypesModule.getTypeAliases().filter(ta => ta.isExported());
		let result = true;
		typeAliases.forEach(
			ta => {
					const typeNode = ta.getTypeNode();
					if(!typeNode){
						const message = `normalized type: ${ta.getName()} was not loaded, failed to get type node`;
						errors.push(helpers.createLoadError(message));
						options.logger.err(message);
						result = false;
						return;
					}

					const tp: helpers.typer = new helpers.typer(typeNode);
					var normalizedTypeModel = new normalized_type(ta, tp, this);
					const loaded = normalizedTypeModel.load(options, errors);
					if(!loaded){
						options.logger.err(`normalized type: ${ta.getName()} was not loaded, check errors`);
						result = false;
						return;
					}

					if(this._normalizedTypes.has(ta.getText())){
						options.logger.err(`normalized type: ${normalizedTypeModel.Name} was not loaded, it has a duplicate name`);
						result = false;
						return;
					}

					this._normalizedTypes.set(normalizedTypeModel.Name, normalizedTypeModel);
			});
		return result;
	}

	async load(options: modeltypes.apiProcessingOptions, errors: adltypes.errorList): Promise<boolean>{
		const mainFilePath = this.rootPath + "/" +"rp.ts";
		const mainFile = this.project.getSourceFile(mainFilePath);

		// failed to load?
		if(!mainFile){
			const message = `can not load package main file at ${this.package.main}`;
			errors.push( helpers.createLoadError(message));
			options.logger.err(message);
			return false;
		}

		// load normalzied types
		const normalizedTypesLoaded = await this.loadNormalizedTypeInfos(options, errors);
		if(!normalizedTypesLoaded) return false;

		// load versions
		const versionsLoaded = await this.loadVersions(options, errors, mainFile);
		if(!versionsLoaded) return false;

		await this.project.emit(); // TODO compilation errors.
		const outDir = (this.project.compilerOptions.get().outDir as string);

		//TODO: once we fix the main file issue
		this._imported = await import(outDir + "/rp.js");

		// now that w have loaded the source code we need to check if versioner
		// referenced in each VersionedApiTypeModel  is exported.
		for(const version of this.Versions){
			for(const vesionedType of version.VersionedTypes){
				// auto is always there.
				if(vesionedType.VersionerName == adltypes.AUTO_VERSIONER_NAME)
					continue;

				if(!this.hasVersioner(vesionedType.VersionerName)){
					const message =`VersionedApiTye: ${version.Name}/${vesionedType.Name} reference a non-exported versioner:${vesionedType.VersionerName}. versioner must be exported at package level`;
					options.logger.err(message);
					errors.push(helpers.createLoadError(message));
					return false;
				}
			}
		}
		// same goes for imperative normalizer
		for(const normalizedType of this.NormalizedTypes){
				// auto is always there
				if(normalizedType.NormalizerName == adltypes.AUTO_NORMALIZER_NAME)
				continue;

			if(!this.hasNormalizer(normalizedType.NormalizerName)){
				const message =`normalized type:${normalizedType.Name} reference a non-exported normalizer:${normalizedType.NormalizerName}. normalizer must be exported at the packae level`;
				options.logger.err(message);
				errors.push(helpers.createLoadError(message));
				return false;
			}
		}
		return true;
	}
}

