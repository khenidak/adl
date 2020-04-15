import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'

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
