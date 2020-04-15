import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'

export class MultipleOfImpl implements machinerytypes.ValidationConstraintImpl{
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
            const factor = context.ConstraintArgs[0] as number;

            if (propVal == undefined) return true;

            if ((propVal as number) % factor != 0) {
                context.errors.push(machinerytypes.createValidationError(`value ${propVal} is not multiple of ${factor}.`, context.fieldPath));
                return false;
            }

            return true;
    }
}

