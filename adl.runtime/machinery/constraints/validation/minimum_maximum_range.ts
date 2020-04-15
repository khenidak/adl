import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'

export class MaximumImpl implements machinerytypes.ValidationConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean{

            const val = leveledTyped[context.propertyName] as number;
            const max = context.ConstraintArgs[0] as number;
            if(val > max){
                context.errors.push(machinerytypes.createValidationError(`value ${val} is out of range expected max is ${max}`, context.fieldPath));
                return false;
            }
            return true;
    }
}


export class MinimumImpl implements machinerytypes.ValidationConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean{

            const val = leveledTyped[context.propertyName] as number;
            const min = context.ConstraintArgs[0] as number;
            if(val < min){
                context.errors.push(machinerytypes.createValidationError(`value ${val} is out of range expected min is ${min}`, context.fieldPath));
                return false;
            }
            return true;
    }
}

// this is written this way to show how we can chain ValidationConstraint
export class RangeImpl implements machinerytypes.ValidationConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean{
            const maxName   = "Maximum";
            const minName = "Minimum";
            const maxImpl = context.machinery.getValidationConstraintImplementation(maxName);
            const minImpl = context.machinery.getValidationConstraintImplementation(minName);

            const clonedMax = Object.assign({}, context) as machinerytypes.ConstraintExecContext;
            clonedMax.ConstraintName = maxName;
            clonedMax.ConstraintArgs = [context.ConstraintArgs[1]];
            clonedMax.errors = new adltypes.errorList(); // we do our own errors

            const clonedMin = Object.assign({}, context) as machinerytypes.ConstraintExecContext;
            clonedMin.ConstraintName = maxName;
            clonedMin.ConstraintArgs = [context.ConstraintArgs[0]];
            clonedMin.errors = new adltypes.errorList(); // we do our own errors


            const maxValidationFailed = maxImpl.Run(clonedMax, rootTyped, leveledTyped, existingRootTyped, existingLeveledTyped, rootApiTypeModel, leveledApiTypeModel, isMapKey);
            const minValidationFailed = maxValidationFailed && minImpl.Run(clonedMin, rootTyped, leveledTyped, existingRootTyped, existingLeveledTyped, rootApiTypeModel, leveledApiTypeModel, isMapKey);

            if(!maxValidationFailed || !minValidationFailed){
                context.errors.push(machinerytypes.createValidationError(`value ${leveledTyped[context.propertyName]} is out of range expected value between ${context.ConstraintArgs[0]} - ${context.ConstraintArgs[1]}`, context.fieldPath));
                return false;
            }


        return true;
    }
}

