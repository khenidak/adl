import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'


// enum validator
export class OneOfImpl implements machinerytypes.ValidationConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean{

            const propertyName = context.propertyName;
            const propVal = leveledTyped[propertyName];
            const property = leveledApiTypeModel.getProperty(propertyName) as modeltypes.ApiTypePropertyModel;

            const possible_values = property.EnumValues;

            for(const possible_val of possible_values){
                if(propVal == possible_val) return true;
            }

            // it is not one of the possible values
            context.errors.push(machinerytypes.createValidationError(`value(${propVal}) is not valid. Valid values are [${possible_values.join(', ')}]`, context.fieldPath));
            return false;
        }
}
