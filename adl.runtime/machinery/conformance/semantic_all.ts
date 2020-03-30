import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../machinery.types'
import * as modeltypes from '../../model/module'

import * as conformancetypes from './conformance.types'



export class enforceLowerCamelCase extends conformancetypes.ApiModelConformanceRule{
    constructor(){
        super();
        this._kind = machinerytypes.ConformanceKind.Shape;
        this._group = "default";
        this._name = "enforceLowerCamelCase";
    }

 RunRule(instance: modeltypes.ApiModel): Array<machinerytypes.ConformanceError>{
        const errs =  new Array<machinerytypes.ConformanceError>();
            if(!modeltypes.isApiModel(instance)) return errs; // skip if input type does not match

    for(let apiVersion of instance.Versions){
            for(let versionApiType of apiVersion.VersionedTypes){
                for(let prop  of versionApiType.Properties){
                        // error if start with upper case char
                    if(prop.Name[0].toUpperCase() ==  prop.Name[0]){
                        var err = new machinerytypes.ConformanceError();
                            err.Scope = machinerytypes.ConformanceRuleScope.VersionedApiType;
                            err.Kind = machinerytypes.ConformanceKind.Shape;
                            err.ViolationKind = machinerytypes.ConformanceViolationKind.Unconformant;
                            err.ModelName = instance.Name;
                            err.VersionName = apiVersion.Name;
                            err.VersionedTypeName = versionApiType.Name;
                            err.TypePropertyName = prop.Name;
                            err.Message = `${apiVersion.Name}/${versionApiType.Name}/${prop.Name} is expected to be in lower camel case`;

                        errs.push(err);
                    }
                }
            }
        }
        return errs;

    }
}

