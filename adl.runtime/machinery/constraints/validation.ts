import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../machinery.types'
import * as modeltypes from '../../model/module'

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

       const propVal = leveledTyped[context.propertyName];
       let regExp = context.ConstraintArgs[0];
       regExp = regExp.replace(/\\\\/g, '\\');
       const re = new RegExp(regExp);
       context.opts.logger.verbose(`constraint: MustMatch prop:${context.propertyName} with value (${propVal}) applying compiled regExp:${re.source}`);

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


export class MinLengthImpl implements machinerytypes.ValidationConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean{

       const propVal = leveledTyped[context.propertyName];
       context.opts.logger.verbose(`constraint:MaxLength for Property:${context.propertyName} value:{propVal} maxLen:${context.ConstraintArgs[0]}`);

       if(propVal == undefined) return true;

       if((propVal as string).length < (context.ConstraintArgs[0] as number)){
        context.errors.push(machinerytypes.createValidationError(`value ${propVal} length is out of range expected min length is ${context.ConstraintArgs[0]}`, context.fieldPath));
       }

        return true;
    }
}

export class MaxLengthImpl implements machinerytypes.ValidationConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        existingRootTyped: any | undefined,
        existingLeveledTyped: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        isMapKey: boolean): boolean{

       const propVal = leveledTyped[context.propertyName];
       context.opts.logger.verbose(`constraint: MinLength for Property:${context.propertyName} value:{propVal} maxLen:${context.ConstraintArgs[0]}`);


       if(propVal == undefined) return true;

            if((propVal as string).length > (context.ConstraintArgs[0] as number)){
        context.errors.push(machinerytypes.createValidationError(`value ${propVal} length is out of range expected max length is ${context.ConstraintArgs[0]}`, context.fieldPath));
       }

        return true;
    }
}


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

