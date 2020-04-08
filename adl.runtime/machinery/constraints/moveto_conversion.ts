import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../machinery.types'
import * as modeltypes from '../../model/module'

class ensuredGraph{
    outModel: modeltypes.ApiTypeModel;
    outPayload: any;
}
export class MoveToImpl implements machinerytypes.ConversionConstraintImpl{
    private ensureObjectGraph(context: machinerytypes.ConstraintExecContext,
                              jsonPath: string,
                              rootModel: modeltypes.ApiTypeModel,
                              rootPayload:any): ensuredGraph{

        let stepModel = rootModel;
        let stepPayload = rootPayload;

        const parts = jsonPath.split(".");

        console.log(parts);
        const first = parts[0];
        if(first == `$`){ // special handling to the $ at the begining of the path
            const reminders = parts.slice(1); // cut
            const newPath = reminders.join(".");
            return this.ensureObjectGraph(context, newPath, stepModel, stepPayload);
        }

        // define the property if it does not exist
        if(!stepPayload.hasOwnProperty(first)){
            stepPayload[first] = {}; // we always assume it is nested objects
        }
        console.log(parts);
        console.log(parts.slice(1));
        console.log(parts.slice(1).length == 2)

        const reminders = parts.slice(1); // cut
        const newPath = reminders.join(".");
        const isLast = (reminders.length == 2);

        if(!isLast){
            // work on the rest
            context.opts.logger.verbose(`first:${first} originalPath:${jsonPath} path:${newPath}`);
            stepModel = (stepModel.getProperty(first) as modeltypes.ApiTypePropertyModel).getComplexDataTypeOrThrow();
            stepPayload = stepPayload[first];
            return this.ensureObjectGraph(context, newPath, stepModel, stepPayload);
        }

        return {
            outModel: stepModel,
            outPayload: stepPayload,
        }
    }

    private getPropertyNameFromPath(jpath: string): string{
        const parts = jpath.split(".");
        return parts[parts.length - 1];
    }


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

        // leveledTyped.hasOwnProperty(context.propertyName) return;
        // if( leveledVersioned[context.propertyName] == undefined) return; // no source

        // for now we assume the path is valid, because once conformance framework is complete
        // each constraint will be validated
        const toPath = context.ConstraintArgs[0] as string;
        const toProp = this.getPropertyNameFromPath(toPath);
        const fromProp = context.propertyName;

        context.opts.logger.verbose(`MoveTo: toPath:${toPath} sourceProperty:${fromProp} targetProp:${toProp}`)
        const ensured  = this.ensureObjectGraph(context, toPath, rootNormalizedModel, rootNormalized);
        let actualleveledNormalizedModel:modeltypes.ApiTypeModel = ensured.outModel;
        let actualLevelNormalized: any = ensured.outPayload;


        console.log(actualLevelNormalized);
        throw new Error("stop");
        return;
        // preflight for same level copy
        if(!actualleveledNormalizedModel) return;
        if(!actualLevelNormalized) return;

        if(actualLevelNormalized.hasOwnProperty(toProp)){ // target already set
                context.opts.logger.err(`MapTo converter found property ${toProp} already defined on the normalized and will not run`);
                return;
        }

        const versionedP = leveledVersionedModel.getProperty(context.propertyName) as modeltypes.ApiTypePropertyModel;
        const normalizedP = actualleveledNormalizedModel.getProperty(toProp);

        /* this needs to be part of constraint validatrion */
        if(!normalizedP){
            context.opts.logger.err(`MapTo converter failed to find property ${toProp} on normalized model ${actualleveledNormalizedModel.Name} and will not run`);
            return;
        }


        // copy.
        if(adltypes.isScalar(leveledVersioned[fromProp])){
            actualLevelNormalized[toProp] = leveledVersioned[fromProp];
            return;
        }
/*
        // TODO map
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
                actualleveledNormalizedModel,
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
                            actualleveledNormalizedModel,
                            versionName,
                            context.fieldPath,
                            context.errors);
                        }
                }else{
                        leveledNormalized[context.propertyName][i] = leveledVersioned[context.propertyName][i];
                }
            }
        }
    */
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

