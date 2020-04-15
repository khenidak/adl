import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'


export class MaxItemsImpl implements machinerytypes.ValidationConstraintImpl {
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean {
            const propVal = leveledTyped[context.propertyName];
            const maximumItems = context.ConstraintArgs[0] as number;

            if (!Array.isArray(propVal)) return true;

            if (propVal.length > maximumItems) {
                context.errors.push(machinerytypes.createValidationError(`array ${propVal} does not satisfy the maximum length: ${maximumItems}.`, context.fieldPath));
                return false;
            }

            return true;
    }
}

export class MinItemsImpl implements machinerytypes.ValidationConstraintImpl {
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean {
            const propVal = leveledTyped[context.propertyName];
            const minimumItems = context.ConstraintArgs[0] as number;

            if (!Array.isArray(propVal)) return true;

            if (propVal.length < minimumItems) {
                context.errors.push(machinerytypes.createValidationError(`array ${propVal} does not satisfy the minimum length: ${minimumItems}.`, context.fieldPath));
                return false;
            }

            return true;
    }
}
