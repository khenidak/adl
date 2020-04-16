import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'


export class RenameToImpl implements machinerytypes.ConversionConstraintImpl{
    ConvertToNormalized(
        context: machinerytypes.ConstraintExecContext,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName: string):{targetModel: modeltypes.ApiTypeModel,targetProperty:modeltypes.ApiTypePropertyModel, target:any} | undefined {

        const to = context.Constraint.Arguments[0] as string;
        // preflight
        if(!leveledVersioned.hasOwnProperty(context.propertyName)) return undefined; // no source

       // preflight for same level copy
        if(!leveledNormalized) return  undefined;
        if(!leveledNormalizedModel) return undefined;

        const versionedP = leveledVersionedModel.getProperty(context.propertyName) as modeltypes.ApiTypePropertyModel;
        const normalizedP = leveledNormalizedModel.getProperty(to)

        if(!normalizedP){
            context.opts.logger.err(`MapTo converter failed to find property ${to} on ${leveledNormalizedModel.Name} and will not run`);
            return undefined;
        }
        return {targetModel:leveledNormalizedModel, targetProperty: normalizedP, target:leveledNormalized};
    }


    ConvertToVersioned(
        context: machinerytypes.ConstraintExecContext,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName: string) : {targetModel: modeltypes.ApiTypeModel,targetProperty:modeltypes.ApiTypePropertyModel,target:any} | undefined {

        const fromProp = context.Constraint.Arguments[0] as string;
        // preflight
        if(!leveledNormalized.hasOwnProperty(fromProp)) return undefined; // no source

        // preflight for same level copy
        if(!leveledNormalized) return undefined;
        if(!leveledNormalizedModel) return undefined;

        const versionedP = leveledVersionedModel.getProperty(context.propertyName) as modeltypes.ApiTypePropertyModel;
        const normalizedP = leveledNormalizedModel.getProperty(fromProp);

        if(!normalizedP){
            context.opts.logger.err(`MapTo converter failed to find property ${fromProp} on ${leveledNormalizedModel.Name} and will not run`);
            return undefined;
        }
        return {targetModel:leveledNormalizedModel, targetProperty: normalizedP, target: leveledNormalized};
    }
}
