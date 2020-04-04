import { Project, TypeAliasDeclaration, TypeReferenceNode } from 'ts-morph';


import * as adltypes from '@azure-tools/adl.types';
import * as modeltypes from './model.types';
import * as helpers from './helpers'

import { versioned_type } from './apiType'
import { makeApiModelDoc } from './apijsdoc'

// describes an api-version, contains a list of all api-versions
export class api_version{
    private _typeInfos = new Map<string, modeltypes.VersionedApiTypeModel>();

    private _Docs: modeltypes.ApiJsDoc | undefined;

    private _moduleName: string = "";
    private _versionName: string ="";

    get Docs(): modeltypes.ApiJsDoc | undefined{
        return this._Docs;
    }


    get Name(): string{
        return this._versionName;
    }

    get ModuleName(): string{
        return this._moduleName;
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

    constructor(private project: Project,
                private rootPath: string,
                private tp: helpers.typerEx,
                private tad: TypeAliasDeclaration,
                private apiModel: modeltypes.ApiModel){}

    load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
        const mod = this.tp.MatchIfInheritsSingle(adltypes.CONSTRAINT_NAME_MODULENAME);
        if(!mod) {
            const message = `failed to load api-version. can't find ModuleFile constraint`;
            errors.push(helpers.createLoadError(message));
            options.logger.err(message);
            return false;
        }

        // set module name
        const ta = mod.getTypeArguments();
        this._moduleName = helpers.quotelessString(ta[0].getText());

        const apiVersionName = this.tp.MatchIfInheritsSingle(adltypes.CONSTRAINT_NAME_APIVERSIONNAME);
        if(!apiVersionName) {
            const message = `failed to load api-version. can't find ApiVersion constraint`;
            errors.push(helpers.createLoadError(message));
            options.logger.err(message);
            return false;
        }
        // set version name
        const ta_versionName = apiVersionName.getTypeArguments();
        this._versionName = helpers.quotelessString(ta_versionName[0].getText());

        // now we can load it
        const moduleFilePath = this.rootPath + "/" +  this.ModuleName + "/" + "module.ts"
        const moduleFile = this.project.getSourceFile(moduleFilePath);
        if(!moduleFile){
            const message = `failed to load api-version. Module file ${moduleFilePath} file does not exis`;
            errors.push(helpers.createLoadError(message));
            options.logger.err(message);
            return false;
        }

        // docs
        this._Docs = makeApiModelDoc(this.tad, options, errors);

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

                let tp: helpers.typerEx = new helpers.typerEx(typeNode.getType());
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
