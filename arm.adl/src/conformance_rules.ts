import * as adltypes from '@azure-tools/adl.types'
import * as adlruntime from '@azure-tools/adl.runtime'
import * as constants from './constants'


// ensures that the api is correctly wrapped in arm envelop
// ensures that properties are not nested in other properties
export class shapeConformer extends adlruntime.VersionedApiTypeConformanceRule{
   constructor(){
     super();
     super._group  = constants.ARM_CONFORMANCE_RULES_GROUP_NAME;
     super._kind   = adlruntime.ConformanceKind.Shape;
     super._name   = "arm:shape_conformance";
   }

   RunRule(instance: adlruntime.VersionedApiTypeModel): Array<adlruntime.ConformanceError>{
    const expected_root_properies = ['apiVersion', 'name', 'id', 'resourceGroup', 'location', 'type', 'tags', 'etag', 'properties'];
    const errors = new Array<adlruntime.ConformanceError>();
    // verify that properties exist at the root level
    for(const p of expected_root_properies){
        const prop = instance.getProperty(p);
        if(prop != undefined) continue;

        const err = new adlruntime.ConformanceError();
        err.Scope = adlruntime.ConformanceRuleScope.VersionedApiType;
        err.Kind = adlruntime.ConformanceKind.Shape;
        err.ViolationKind = adlruntime.ConformanceViolationKind.Unconformant;
        err.VersionedTypeName = instance.Name;
        err.TypePropertyName = p;
        err.Message = `arm resource ${instance.Name} is unconformant, missing top level property ${p}. all arm resources must be correct wrapped in arm envelop`;

        errors.push(err);
    }

    const properties_prop = instance.getProperty("properties") as adlruntime.ApiTypePropertyModel; // should not fail because we checked
    if(properties_prop.DataTypeKind != adlruntime.PropertyDataTypeKind.Complex){
        // properties must be a complex type
        const err = new adlruntime.ConformanceError();
        err.Scope = adlruntime.ConformanceRuleScope.VersionedApiType;
        err.Kind = adlruntime.ConformanceKind.Shape;
        err.ViolationKind = adlruntime.ConformanceViolationKind.Unconformant;
        err.ModelName = instance.Name;
        err.VersionedTypeName = instance.Name;
        err.TypePropertyName = "properties";
        err.Message = `arm resource ${instance.Name} is unconformant, properties must be defined as a complex type`;
        errors.push(err);
    }
    this.findNestedProperties(instance.Name, errors, properties_prop.getComplexDataTypeOrThrow(), adltypes.getRootFieldDesc());
    return errors;
 }


 private findNestedProperties(parentName:string, errors:Array<adlruntime.ConformanceError>, model: adlruntime.ApiTypeModel, parent_field: adltypes.fieldDesc){
   for(const prop of model.Properties){
    const current_field = new adltypes.fieldDesc(prop.Name, parent_field);

    if(prop.Name == "properties"){
        const err = new adlruntime.ConformanceError();
        err.Scope = adlruntime.ConformanceRuleScope.VersionedApiType;
        err.Kind = adlruntime.ConformanceKind.Shape;
        err.ViolationKind = adlruntime.ConformanceViolationKind.Unconformant;
        err.ModelName = model.Name;
        err.VersionedTypeName = parentName;
        err.TypePropertyName = current_field.path;
        err.Message = `arm resource ${parentName} is unconformant, property with name "properties" is not allowed in nested types`;
        errors.push(err);
    }

    if(prop.DataTypeKind == adlruntime.PropertyDataTypeKind.Complex ||
       prop.DataTypeKind == adlruntime.PropertyDataTypeKind.ComplexArray){
        this.findNestedProperties(parentName, errors, prop.getComplexDataTypeOrThrow(), current_field)
    }

   }
 }
}

