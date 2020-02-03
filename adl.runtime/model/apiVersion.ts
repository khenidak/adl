import { Project, TypeAliasDeclaration, TypeReferenceNode } from 'ts-morph';

// ApiVersionInfo describes a version of the api
// Each version is represented by a ts file.
// each type in the version is represented by an exported type alias
// in the form of:
// export type MyApIType = my fancy interface & my other fancy thing


import * as adltypes from '@azure-tools/adl.types';
import * as modeltypes from './model.types';
import * as helpers from './helpers'

import { versioned_type } from './apiType'

export class api_version{
	private _typeInfos = new Map<string, modeltypes.VersionedApiTypeModel>();

	get Name(): string{
		var name = this.tp.MatchSingle("ApiVersion");
		if(!name) return "";

		var ta = (name as TypeReferenceNode).getTypeArguments();
		if(ta.length == 0) return "";

		return helpers.quotelessString(ta[0].getText());
	}

	get ModuleName(): string{
		var mod = this.tp.MatchSingle("ModuleName");
		if(!mod) return "";

		var ta = (mod as TypeReferenceNode).getTypeArguments();
		if (ta.length == 0) return "";

		return helpers.quotelessString(ta[0].getText());
	}

	get VersionedTypes(): Iterable<modeltypes.VersionedApiTypeModel> {
		var infos = new Array<modeltypes.VersionedApiTypeModel>();

		for(let [k,v] of this._typeInfos)
			infos.push(v);

		return infos;
	}

	getVersionedType(name: string): modeltypes.VersionedApiTypeModel | undefined{
		return this._typeInfos.get(name);
	}

	constructor(private project: Project, private rootPath: string, private tp: helpers.typer, private apiModel: modeltypes.ApiModel){}

	load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
		const moduleFilePath = this.rootPath + "/" +  this.ModuleName + "/" + "module.ts"
		const moduleFile = this.project.getSourceFile(moduleFilePath);
		if(!moduleFile){
			const message = `failed to load api-version. Module file ${moduleFilePath} file does not exis`;
			errors.push(helpers.createLoadError(message));
			options.logger.err(message);
			return false;
		}

		var typeAliases = moduleFile.getTypeAliases().filter(ta => ta.isExported());
		let result = true;

		typeAliases.forEach(
			ta => {
				var typeNode = ta.getTypeNode();
				if(!typeNode){
					const message = `failed to load VersionedApiType ${this.ModuleName}/${ta.getName()}. failed to get typeNode`;
					errors.push(helpers.createLoadError(message));
					options.logger.err(message);
					result = false;
					return;
				}

				let tp: helpers.typer = new helpers.typer(typeNode);
				let versionedApiTypeInfo: versioned_type = new versioned_type(ta, tp, this.apiModel);
				const loaded = versionedApiTypeInfo.load(options, errors);

				if(!loaded){
					const message = `failed to load VersionedApiType ${this.ModuleName}/${ta.getName()}. check errors`;
					errors.push(helpers.createLoadError(message));
					options.logger.err(message);
					result = false;
					return;
				}

				if(this._typeInfos.has(versionedApiTypeInfo.Name)){
					const message = `failed to load VersionedApiType ${this.ModuleName}/${ta.getName()}. duplicate name`;
					errors.push(helpers.createLoadError(message));
					options.logger.err(message);
					result = false;
				}

				this._typeInfos.set(versionedApiTypeInfo.Name, versionedApiTypeInfo);
			});

			return result;
	}

}
