import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'


//TODO: @khenidak review when value is map
function getValueForProp(context: machinerytypes.ConstraintExecContext,
                         leveledTyped:any,
                          leveledApiTypeModel: modeltypes.ApiTypeModel, isMapKey:boolean):any{
    if(isMapKey) return leveledTyped;
    return leveledTyped[context.propertyName]
}

export class MustMatchImpl implements machinerytypes.ValidationConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean{

       const propVal = getValueForProp(context,leveledTyped, leveledApiTypeModel, isMapKey);
       let regExp = context.Constraint.Arguments[0];
       regExp = regExp.replace(/\\\\/g, '\\');
       let ignoreCase = JSON.parse(context.Constraint.Arguments[1]);
       const re = ignoreCase ? new RegExp(regExp, 'i') : new RegExp(regExp);
       context.opts.logger.verbose(`constraint: MustMatch prop:${context.propertyName} with value (${propVal}) applying compiled regExp:${re.source} with ignore case set to ${ignoreCase}`);

       if(!re.test(propVal)){
         const propModel = leveledApiTypeModel.getProperty(context.propertyName) as modeltypes.ApiTypePropertyModel;
         let details = " ";
         if(propModel.isAliasDataType){
            details = `for ${context.propertyName}(${propModel.AliasDataTypeName})`
         }else{
            details = `for ${context.propertyName}`
         }
         context.errors.push(machinerytypes.createValidationError(`value(${propVal}) is not valid ${details} must match regexp:`+regExp, context.fieldPath));
       }
        return true;
    }
}

