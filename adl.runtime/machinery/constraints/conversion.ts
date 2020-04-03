import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../machinery.types'
import * as modeltypes from '../../model/module'


export class MapToImpl implements machinerytypes.ConversionConstraintImpl{
    ConvertToNormalized(
        context: machinerytypes.ConstraintExecContext,
        r : machinerytypes.ApiRuntime,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any | undefined,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel | undefined,
        versionName: string): void{

        const to = context.ConstraintArgs[0] as string;
        // preflight
        if(leveledVersioned[context.propertyName] == undefined) return; // no source

        //for now we only support same level
        if(to.charAt(0) == "$")
            throw new Error("json path is not implemented yet");

        // preflight for same level copy
        if(!leveledNormalized) return;
        if(!leveledNormalizedModel) return;

        if(leveledNormalized[to] != undefined){ // target already set
                context.opts.logger.err(`MapTo converter found property ${to} already defined on the normalized and will not run`);
                return;
        }

        const versionedP = leveledVersionedModel.getProperty(context.propertyName) as modeltypes.ApiTypePropertyModel;
        const normalizedP = leveledNormalizedModel.getProperty(to)

        if(!normalizedP){
            context.opts.logger.err(`MapTo converter failed to find property ${to} on ${leveledNormalizedModel.Name} and will not run`);
            return;
        }

     // copy.
        if(adltypes.isScalar(leveledVersioned[context.propertyName])){
            leveledNormalized[to] = leveledVersioned[context.propertyName];
            return;
        }


        if(adltypes.isComplex(leveledVersioned[context.propertyName])){
            leveledNormalized[context.propertyName] = {};
            // run auto converter on object
            r.auto_convert_versioned_normalized(
                rootVersioned,
                leveledVersioned[context.propertyName],
                rootNormalized,
                leveledNormalized[context.propertyName],
                rootVersionedModel,
                normalizedP.getComplexDataTypeOrThrow(),
                rootNormalizedModel,
                leveledNormalizedModel,
                versionName,
                context.fieldPath,
                context.errors);
            return;
        }

        if(adltypes.isArray(leveledVersioned[context.propertyName])){
            leveledNormalized[context.propertyName] = [];
            for(let i =0; i < leveledVersioned[context.propertyName].length; i++){
                // create indexed field desc
                const indexedFieldDesc = new adltypes.fieldDesc("", context.fieldPath);
                indexedFieldDesc.index = i;
                if(adltypes.isComplex(leveledVersioned[context.propertyName][i])){
                    leveledNormalized[context.propertyName][i] = {};
                    if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                        // run auto converter on object
                        r.auto_convert_versioned_normalized(
                            rootVersioned,
                            leveledVersioned[context.propertyName][i],
                            rootNormalized,
                            leveledNormalized[context.propertyName][i],
                            rootVersionedModel,
                            normalizedP.getComplexDataTypeOrThrow(),
                            rootNormalizedModel,
                            leveledNormalizedModel,
                            versionName,
                            context.fieldPath,
                            context.errors);
                        }
                }else{
                        leveledNormalized[context.propertyName][i] = leveledVersioned[context.propertyName][i];
                }
            }
        }
    }


    ConvertToVersioned(
        context: machinerytypes.ConstraintExecContext,
        r : machinerytypes.ApiRuntime,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any | undefined,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel | undefined,
        versionName: string){

        const to = context.ConstraintArgs[0] as string;
        // preflight
        if(leveledNormalized[to] == undefined) return; // no source

        //for now we only support same level
        if(to.charAt(0) == "$")
            throw new Error("json path is not implemented yet");

        // preflight for same level copy
        if(!leveledNormalized) return;
        if(!leveledNormalizedModel) return;

        if(leveledVersioned[context.propertyName] != undefined){ // target already set
                context.opts.logger.err(`MapTo converter found property ${to} already defined on the normalized and will not run`);
                return;
        }

        const versionedP = leveledVersionedModel.getProperty(context.propertyName) as modeltypes.ApiTypePropertyModel;
        const normalizedP = leveledNormalizedModel.getProperty(to)

        if(!normalizedP){
            context.opts.logger.err(`MapTo converter failed to find property ${to} on ${leveledNormalizedModel.Name} and will not run`);
            return;
        }

     // copy.

        if(adltypes.isScalar(leveledNormalized[to]) && versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar){
            leveledVersioned[context.propertyName] = leveledNormalized[to];
            return;
        }

        if(adltypes.isComplex(leveledNormalized[to]) && versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
            leveledVersioned[context.propertyName] = {};
            // run auto converter on object
            r.auto_convert_normalized_versioned(
                rootVersioned,
                leveledVersioned[context.propertyName],
                rootNormalized,
                leveledNormalized[context.propertyName],
                rootVersionedModel,
                normalizedP.getComplexDataTypeOrThrow(),
                rootNormalizedModel,
                leveledNormalizedModel,
                versionName,
                context.fieldPath,
                context.errors);
            return;
        }


        if(adltypes.isArray(leveledNormalized[to])){
            leveledVersioned[context.propertyName] = [];
            for(let i =0; i < leveledNormalized[to].length; i++){
                // create indexed field desc
                const indexedFieldDesc = new adltypes.fieldDesc("", context.fieldPath);
                indexedFieldDesc.index = i;
                if(adltypes.isComplex(leveledNormalized[to][i])){
                    leveledVersioned[context.propertyName][i] = {};

                    if(versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                        // run auto converter on object
                        r.auto_convert_normalized_versioned(
                            rootVersioned,
                            leveledVersioned[context.propertyName][i],
                            rootNormalized,
                            leveledNormalized[context.propertyName][i],
                            rootVersionedModel,
                            normalizedP.getComplexDataTypeOrThrow(),
                            rootNormalizedModel,
                            leveledNormalizedModel,
                            versionName,
                            context.fieldPath,
                            context.errors);
                        }
                }else{
                        leveledVersioned[context.propertyName][i] = leveledNormalized[to][i];
                }
            }
        }
    }
}
