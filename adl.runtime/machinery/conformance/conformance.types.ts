import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../machinery.types'
import * as modeltypes from '../../model/module'

// base narrow scope conformance rules
export abstract class ConformanceRuleBase<T extends modeltypes.AnyAdlModel> implements machinerytypes.ConformanceRule<T>{
    _group: string = machinerytypes.DEFAULT_CONFORMANCE_GROUP;
 _kind: machinerytypes.ConformanceKind = machinerytypes.ConformanceKind.Semantic;
    _name: string = "";

    readonly Scope: machinerytypes.ConformanceRuleScope = machinerytypes.ConformanceRuleScope.Api;

    get Group(): string{ return this._group};
    get Name(): string{return this._name};

    get Kind():machinerytypes.ConformanceKind {
        return this._kind;
    }
    abstract RunRule(instance: T): Array<machinerytypes.ConformanceError>;
}

// narrow rules

export abstract class ApiModelConformanceRule extends ConformanceRuleBase<modeltypes.ApiModel>{
    abstract RunRule(instance: modeltypes.ApiModel): Array<machinerytypes.ConformanceError>;
}

export abstract class NormalizedApiTypeConformanceRule extends ConformanceRuleBase<modeltypes.NormalizedApiTypeModel>{
        abstract RunRule(instance: modeltypes.NormalizedApiTypeModel): Array<machinerytypes.ConformanceError>;
}

export abstract class ApiVersionConformanceRule extends ConformanceRuleBase<modeltypes.ApiVersionModel>{
    abstract RunRule(instance: modeltypes.ApiVersionModel): Array<machinerytypes.ConformanceError>;
}

//TODO: narrow for all types versioned and non versioned
export abstract class VersionedApiTypeConformanceRule extends ConformanceRuleBase<modeltypes.VersionedApiTypeModel>{
    abstract RunRule(instance: modeltypes.VersionedApiTypeModel): Array<machinerytypes.ConformanceError>;
}

export abstract class ApiTypePropertyConformanceRule extends ConformanceRuleBase<modeltypes.ApiTypePropertyModel>{
    abstract RunRule(instance: modeltypes.ApiTypePropertyModel): Array<machinerytypes.ConformanceError>;
}
