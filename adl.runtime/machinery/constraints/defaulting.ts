import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../machinery.types'
import * as modeltypes from '../../model/module'

export class DefaultValueImpl implements machinerytypes.DefaultingConstraintImpl{
    Run(
        context: machinerytypes.ConstraintExecContext,
        rootTyped: any,
        leveledTyped: any,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel):void{


        const p = leveledApiTypeModel.getProperty(context.propertyName);
        if(!p){
            context.opts.logger.err(`DefaultValue defaulter failed to find property ${context.propertyName} on ${leveledApiTypeModel.Name} and will not run`);
            return;
        }

        // set default value
        if(leveledTyped[context.propertyName] == undefined){
            leveledTyped[context.propertyName] = context.ConstraintArgs[0];
            return;
        }

        if(p.DataTypeName == "string" && leveledTyped[context.propertyName] == ""){
            leveledTyped[context.propertyName] = context.ConstraintArgs[0] as string;
            return;
        }

        if(p.DataTypeName == "number" && leveledTyped[context.propertyName] == 0){
            leveledTyped[context.propertyName] = context.ConstraintArgs[0] as number;
            return;
        }
    }
}

