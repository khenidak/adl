import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from './machinery.types'
import * as modeltypes from '../model/module'

// TODO: !!!+++ NULL CHECKS IS MISSING +++ !!! //

/* What is walking the object graph mean (used below frequently):
    * given a payload that looks like
    * {     ..key value properties..
    *       complexObject: {
    *               ..key value properties..
    *           }
    *       arrayOfComplex: [
    *               {
    *                   ..key value properties..
    *               }
    *       ]
    *       arrayOfSimple: [ "", "", ""]
    *       }
    *   Walking means going from root object to every single property, including those
    *   which might be part of an complex object inside an array.
    */
function createConstraintExecCtx(
        machinery: machinerytypes.ApiMachinery,
        opts: modeltypes.apiProcessingOptions,
        Constraint: modeltypes.ConstraintModel,
        propertyName: string,
        fieldPath: adltypes.fieldDesc,
        errors: adltypes.errorList
    ): machinerytypes.ConstraintExecContext {
        return {
            machinery: machinery,
            opts: opts,
            Constraint: Constraint,
            propertyName: propertyName,
            fieldPath: fieldPath,
            errors: errors,
        };
}

export class InvalidErrorApiModel extends Error {
    constructor(apiInfoName: string) {
        super(`api:${apiInfoName} does not exist`);
        }
}

export class InvalidApiVersionModel extends Error {
    constructor(apiVersionInfoName: string) {
        super(`api-version:${apiVersionInfoName} does not exist`);
        }
}

export class InvalidApiTypeModel extends Error {
    constructor(apiVersionTypeName: string) {
        super(`api-type:${apiVersionTypeName} does not exist`);
        }
}

export class apiRuntime implements machinerytypes.ApiRuntime{
    constructor(private store: machinerytypes.ApiManager, private machinery: machinerytypes.ApiMachinery, private opts: modeltypes.apiProcessingOptions){}

    auto_convert_versioned_normalized_map(
            versionedP: modeltypes.ApiTypePropertyModel,
            normalizedP: modeltypes.ApiTypePropertyModel,
            rootVersioned: any,
            leveledVersioned: any,
            rootNormalized: any,
            leveledNormalized: any,
            rootVersionedModel:modeltypes.ApiTypeModel,
            leveledVersionedModel:modeltypes.ApiTypeModel,
            rootNormalizedModel: modeltypes.ApiTypeModel,
            leveledNormalizedModel: modeltypes.ApiTypeModel,
            versionName: string,
            currentFieldDesc: adltypes.fieldDesc,
            errors:  adltypes.errorList): void{

          // assumptions:
          // null is prechecked
          // target object {} is already created
          // target and src props already exist
          for(const key of Object.keys(leveledVersioned[versionedP.Name])){
            if(leveledVersioned[versionedP.Name][key] == null){
                leveledNormalized[normalizedP.Name][key] = leveledVersioned[versionedP.Name][key];
                continue;
            }
            if(adltypes.isScalar(leveledVersioned[versionedP.Name][key])){
                leveledNormalized[normalizedP.Name][key] = leveledVersioned[versionedP.Name][key];
                continue;
            }
            // input must be a complx object
            // if target is not complex map then copy as is
            if(normalizedP.DataTypeKind != modeltypes.PropertyDataTypeKind.ComplexMap){
                leveledNormalized[normalizedP.Name][key] = leveledVersioned[versionedP.Name][key];
                continue;
            }

            // if target is a complex map
            leveledNormalized[normalizedP.Name][key] = {};
            this.opts.logger.info(`auto-normalize: attempting to process property ${versionedP.Name} as complex map`);
            const walkField =  new adltypes.fieldDesc(key, currentFieldDesc);
            this.auto_convert_versioned_normalized(
                rootVersioned,
                leveledVersioned[versionedP.Name][key],
                rootNormalized,
                leveledNormalized[normalizedP.Name][key],
                rootVersionedModel,
                versionedP.getComplexDataTypeOrThrow(),
                rootNormalizedModel,
                normalizedP.getComplexDataTypeOrThrow(),
                versionName,
                walkField,
                errors);
        }
    }

    auto_convert_versioned_normalized_array(
            versionedP: modeltypes.ApiTypePropertyModel,
            normalizedP: modeltypes.ApiTypePropertyModel,
            rootVersioned: any,
            leveledVersioned: any,
            rootNormalized: any,
            leveledNormalized: any,
            rootVersionedModel:modeltypes.ApiTypeModel,
            leveledVersionedModel:modeltypes.ApiTypeModel,
            rootNormalizedModel: modeltypes.ApiTypeModel,
            leveledNormalizedModel: modeltypes.ApiTypeModel,
            versionName: string,
            currentFieldDesc: adltypes.fieldDesc,
            errors:  adltypes.errorList): void{

          // assumptions:
          // null is prechecked
          // target object [] is already created
          // target and src props already exist
         for(let i =0; i < leveledVersioned[versionedP.Name].length; i++){
            // create indexed field desc
            const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
            indexedFieldDesc.index = i;
            // here we have to copy anyway to maintain array size. (versioned.len == normalized.len)
            // even if they are not equal data types (validation will validate it).
            if(adltypes.isComplex(leveledVersioned[versionedP.Name][i])){
                leveledNormalized[versionedP.Name][i] = {};
                if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                    this.auto_convert_versioned_normalized(
                        rootVersioned,
                        leveledVersioned[versionedP.Name][i],
                        rootNormalized,
                        leveledNormalized[normalizedP.Name][i],
                        rootVersionedModel,
                        versionedP.getComplexDataTypeOrThrow(),
                        rootNormalizedModel,
                        normalizedP.getComplexDataTypeOrThrow(),
                        versionName,
                        indexedFieldDesc,
                        errors);
                }else{
                    leveledNormalized[normalizedP.Name][i] = leveledVersioned[versionedP.Name][i];
                    continue;
                }
            }else{
                leveledNormalized[normalizedP.Name][i] = leveledVersioned[versionedP.Name][i];
                continue;
            }
          }
    }
    // runs auto conversion process. the auto conversion process walks
    // the object graph and find:
    // property name and datatype that are equal => copy data from versioned=>normalized
    // and DOES NOT HAVE  NoAutoConversion constraint
    private auto_convert_versioned_normalized(
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName: string,
        parent_field: adltypes.fieldDesc,
        errors:  adltypes.errorList): void{

        //step-1: for each property try to convert it to normalized
        for(let propertyName of Object.keys(leveledVersioned)) {
            const currentFieldDesc =  new adltypes.fieldDesc(propertyName, parent_field);
            const versionedP = leveledVersionedModel.getProperty(propertyName);

            // step-1.1: check if property is extra (does not exist in versioned model)
            if(versionedP == undefined){
                errors.push(adltypes.createKnownError_ExtraProperty(currentFieldDesc));
                continue; // keep going
            }

            //step-1.2: execute versioned defaulting
            const defaultingConstraints =  versionedP.getDefaultingConstraints();
            for(let c of defaultingConstraints){
                const implementation = this.machinery.getDefaultingConstraintImplementation(c.Name);
                // run it
                const ctx = createConstraintExecCtx(this.machinery, this.opts, c, propertyName, currentFieldDesc,errors);
                implementation.Run(ctx, rootVersioned, leveledVersioned, rootVersionedModel, leveledVersionedModel)
            }

            //step-1.3: execute conversion constraint, we always assume max of conversion constraint.
            const conversionConstraints = versionedP.getConversionConstraints();
            let c = (conversionConstraints.length > 0) ? conversionConstraints[0] : undefined;
            let target_changed = undefined;
            if(c != undefined){
                const impl = this.machinery.getConversionConstraintImplementation(c.Name);
                const ctx = createConstraintExecCtx(this.machinery, this.opts, c, propertyName, currentFieldDesc,errors);
                target_changed = impl.ConvertToNormalized(
                    ctx,
                    rootVersioned,
                    leveledVersioned,
                    rootNormalized,
                    leveledNormalized,
                    rootVersionedModel,
                    leveledVersionedModel,
                    rootNormalizedModel,
                    leveledNormalizedModel,
                    versionName);
            }

            //step-1.4: check for  noauto conversion?
            if(versionedP.isManaullyConverted){
                this.opts.logger.verbose(`auto-normalize: property ${leveledVersionedModel.Name}/${versionedP.Name} is marked for NoAutoConvert, ignoring`);
                continue;
            }

            //step-1.5: get the actual target model and property. Which can be an outcome of a conversion constraint
            const actual_normalizedP = (target_changed != undefined) ? target_changed.targetProperty : leveledNormalizedModel.getProperty(versionedP.Name);
            const actual_leveledNormalizedModel = (target_changed != undefined) ? target_changed.targetModel : leveledNormalizedModel;
            const actual_leveledNormalized = (target_changed != undefined) ? target_changed.target : leveledNormalized;

            //step-1.6: if target does not exist then bail out
            if(actual_normalizedP == undefined){
                this.opts.logger.info(`auto-normalize: property ${leveledVersionedModel.Name}/${versionedP.Name} does not exist in normalized model ${actual_leveledNormalizedModel.Name}, ignoring`);
                continue; // this property does not exist in normalized
            }

            //step1.7: if src and target are of different data type. then copy and bail out
            if(versionedP.DataTypeKind != actual_normalizedP.DataTypeKind){
                this.opts.logger.wrn(`auto-normalize: property ${versionedP.Name} has different DataTypeKind on versioned and normalized models, copying anyway`);
                actual_leveledNormalized[actual_normalizedP.Name] = leveledVersioned[versionedP.Name];
                continue;
            }

            //step-1.8: copy nulls and bail out
            if(leveledVersioned[propertyName] == null){
                this.opts.logger.verbose(`auto-normalize: property ${propertyName} copied as null value`);
                actual_leveledNormalized[actual_normalizedP.Name] = null;
                continue;
            }

            //step-1.9: conversion
            if(adltypes.isScalar(leveledVersioned[propertyName])){
                actual_leveledNormalized[actual_normalizedP.Name] = leveledVersioned[versionedP.Name];
                continue;
            }

            // convert it as an object
            if(adltypes.isComplex(leveledVersioned[versionedP.Name])){
                if(!actual_leveledNormalized.hasOwnProperty(actual_normalizedP.Name))
                    actual_leveledNormalized[actual_normalizedP.Name] = {}; // simply because a conversion constraint might have left a trail
 
                if(actual_normalizedP.isMap()){
                    this.auto_convert_versioned_normalized_map(
                        versionedP,
                        actual_normalizedP,
                        rootVersioned,
                        leveledVersioned,
                        rootNormalized,
                        actual_leveledNormalized,
                        rootVersionedModel,
                        leveledVersionedModel,
                        rootNormalizedModel,
                        actual_leveledNormalizedModel,
                        versionName,
                        currentFieldDesc,
                        errors);
                    continue;
                }

                // if target is complex then process
               if(actual_normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                    this.auto_convert_versioned_normalized(
                        rootVersioned,
                        leveledVersioned[versionedP.Name],
                        rootNormalized,
                        actual_leveledNormalized[actual_normalizedP.Name],
                        rootVersionedModel,
                        versionedP.getComplexDataTypeOrThrow(),
                        rootNormalizedModel,
                        actual_normalizedP.getComplexDataTypeOrThrow(),
                        versionName,
                        currentFieldDesc,
                        errors);
                        continue;
                }

                // we don't know what is that, copy as is, let the validation deal with it
                actual_leveledNormalized[actual_normalizedP.Name] = leveledVersioned[versionedP.Name];
                continue;
            }

            if(adltypes.isArray(leveledVersioned[versionedP.Name])){
                if(!actual_leveledNormalized.hasOwnProperty(actual_normalizedP.Name))
                    actual_leveledNormalized[actual_normalizedP.Name] = []; // simply because a conversion constraint might have left a trail

                this.auto_convert_versioned_normalized_array(
                    versionedP,
                    actual_normalizedP,
                    rootVersioned,
                    leveledVersioned,
                    rootNormalized,
                    actual_leveledNormalized,
                    rootVersionedModel,
                    leveledVersionedModel,
                    rootNormalizedModel,
                    actual_leveledNormalizedModel,
                    versionName,
                    currentFieldDesc,
                    errors);
                continue;
            }
        }

        //step-2.0: check for missing keys. shallow per each object
        if(Object.keys(leveledVersioned).length != leveledVersionedModel.Properties.length){
            for(const p of leveledVersionedModel.Properties){
                const currentFieldDesc =  new adltypes.fieldDesc(p.Name, parent_field);
                if(!p.isOptional && !leveledVersioned.hasOwnProperty(p.Name)){
                    errors.push(adltypes.createKnownError_MissingProperty(currentFieldDesc));
                }
            }
        }
    }

    // convert runs the auto conversion process then runs the imperative converter as declerated
    // by the VersionedApiTypeModel
    private convert_versioned_normalized(
            versioned: any,
            normalized: any,
            apiModel: modeltypes.ApiModel,
            versionName: string,
            versionedTypeModel: modeltypes.VersionedApiTypeModel,
            normalizedApiTypeModel: modeltypes.NormalizedApiTypeModel,
            parent_field: adltypes.fieldDesc,
            errors:  adltypes.errorList): void{

            // auto, note auto takes in root and leveled
            this.auto_convert_versioned_normalized(
                versioned,
                versioned,
                normalized,
                normalized,
                versionedTypeModel,
                versionedTypeModel,
                normalizedApiTypeModel,
                normalizedApiTypeModel,
                versionName,
                parent_field,
                errors);

            if(errors.length > 0)
                return normalized; // can't go to next phase without clean errors

            // run the imperative versioner - if it is not auto
            if(versionedTypeModel.VersionerName == adltypes.AUTO_VERSIONER_NAME) return;

            this.opts.logger.info(`spec versioner:${versionedTypeModel.VersionerName} normalize ${apiModel.Name}/${versionName}/${versionedTypeModel.Name} => ${normalizedApiTypeModel.Name}`);
            const imperative_versioner  = apiModel.createSpecInstance(versionedTypeModel.VersionerName) as adltypes.Versioner<adltypes.Normalized, adltypes.Versioned>;
            // run it == TODO: metric collection here
            imperative_versioner.Normalize(versioned as adltypes.Versioned, normalized as adltypes.Versioned, errors);
    }

    private auto_convert_normalized_versioned_map(
        versionedP: modeltypes.ApiTypePropertyModel,
        normalizedP: modeltypes.ApiTypePropertyModel,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel: modeltypes.ApiTypeModel,
        leveledVersionedModel: modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName:string,
        currentFieldDesc: adltypes.fieldDesc,
        errors: adltypes.errorList): void{

        if(normalizedP.getMapKeyDataTypeNameOrThrow() != versionedP.getMapKeyDataTypeNameOrThrow()){
            return
        }

        //if simple map, value data type needs tp match
        if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Map &&
           normalizedP.getMapValueDataTypeNameOrThrow() != versionedP.getMapValueDataTypeNameOrThrow()){
            return;
        }

        for(const key of Object.keys(leveledNormalized[normalizedP.Name])){
            const walkField = new adltypes.fieldDesc(key, currentFieldDesc);
            // if value null then just copy
            if(leveledNormalized[normalizedP.Name][key] == null){
                leveledVersioned[versionedP.Name][key] = leveledNormalized[normalizedP.Name][key];
                continue;
            }

            if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Map){
                leveledVersioned[versionedP.Name][key] = leveledNormalized[normalizedP.Name][key];
            }else{
                 leveledVersioned[versionedP.Name][key] = {}
                 this.auto_convert_normalized_versioned(
                        rootVersioned,
                        leveledVersioned[versionedP.Name][key],
                        rootNormalized,
                        leveledNormalized[normalizedP.Name][key],
                        rootNormalizedModel,
                        normalizedP.getComplexDataTypeOrThrow(),
                        rootVersionedModel,
                        versionedP.getComplexDataTypeOrThrow(),
                        versionName,
                        walkField,
                        errors);
            }
        }
    }

    private auto_convert_normalized_versioned_array(
        versionedP: modeltypes.ApiTypePropertyModel,
        normalizedP: modeltypes.ApiTypePropertyModel,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel: modeltypes.ApiTypeModel,
        leveledVersionedModel: modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName:string,
        currentFieldDesc: adltypes.fieldDesc,
        errors:  adltypes.errorList): void{

        // for simple array, only copy if they have the same base data types
        if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ScalarArray){
            if(normalizedP.DataTypeName != versionedP.DataTypeName) return;
        }

        // copy//
        for(let i =0; i < leveledNormalized[normalizedP.Name].length; i++){
            // create indexed field desc
            const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
            indexedFieldDesc.index = i;

            // null elements..
            if(leveledNormalized[normalizedP.Name][i] == null){
                leveledVersioned[versionedP.Name][i] = null;
                continue;
            }
            if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ScalarArray){
                leveledVersioned[versionedP.Name][i] = leveledNormalized[normalizedP.Name][i];
                continue;
            }
            // must be  complex object
            // create the target object anyway
            leveledVersioned[versionedP.Name][i] = {};
            this.auto_convert_normalized_versioned(
                rootVersioned,
                leveledVersioned[versionedP.Name][i],
                rootNormalized,
                leveledNormalized[normalizedP.Name][i],
                rootVersionedModel,
                versionedP.getComplexDataTypeOrThrow(),
                rootNormalizedModel,
                normalizedP.getComplexDataTypeOrThrow(),
                versionName,
                indexedFieldDesc,
                errors);
        }
    }

    private auto_convert_normalized_versioned_property(
        versionedP: modeltypes.ApiTypePropertyModel,
        normalizedP: modeltypes.ApiTypePropertyModel,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel: modeltypes.ApiTypeModel,
        leveledVersionedModel: modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName:string,
        currentFieldDesc: adltypes.fieldDesc,
        errors:  adltypes.errorList): void{

        //step1: if no source, no copy
        if(!leveledNormalized.hasOwnProperty(normalizedP.Name)) return;

        // step-2: null source
        if(leveledNormalized[normalizedP.Name] == null){
            leveledVersioned[versionedP.Name] = null;
            return;
        }

        // step-3: scalar data types
        // // we don't need check versionedP, since we precheck that data type match
        if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar){
            if(normalizedP.DataTypeName == versionedP.DataTypeName){
                leveledVersioned[versionedP.Name] = leveledNormalized[normalizedP.Name];
            }
            return;
        }

        //step-4: copy complex object
        if(normalizedP.isMap()){ // we don't need check versionedP, since we precheck that data type match
            if(!leveledVersioned.hasOwnProperty(versionedP.Name)) leveledVersioned[versionedP.Name] = {};
            this.auto_convert_normalized_versioned_map(
                versionedP,
                normalizedP,
                rootVersioned,
                leveledVersioned,
                rootNormalized,
                leveledNormalized,
                rootVersionedModel,
                leveledVersionedModel,
                rootNormalizedModel,
                leveledNormalizedModel,
                versionName,
                currentFieldDesc,
                errors);
            return;
        }

        if(normalizedP.isArray()){
            if(!leveledVersioned.hasOwnProperty(versionedP.Name)) leveledVersioned[versionedP.Name] = [];
             this.auto_convert_normalized_versioned_array(
                versionedP,
                normalizedP,
                rootVersioned,
                leveledVersioned,
                rootNormalized,
                leveledNormalized,
                rootVersionedModel,
                leveledVersionedModel,
                rootNormalizedModel,
                leveledNormalizedModel,
                versionName,
                currentFieldDesc,
                errors);
            return;
        }

        // must be a complex type
        if(!leveledVersioned.hasOwnProperty(versionedP.Name)) leveledVersioned[versionedP.Name] = {};
            this.auto_convert_normalized_versioned(
                rootVersioned,
                leveledVersioned[versionedP.Name],
                rootNormalized,
                leveledNormalized[normalizedP.Name],
                rootVersionedModel,
                versionedP.getComplexDataTypeOrThrow(),
                rootNormalizedModel,
                normalizedP.getComplexDataTypeOrThrow(),
                versionName,
                currentFieldDesc,
                errors);
    }

    auto_convert_normalized_versioned(
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel: modeltypes.ApiTypeModel,
        leveledVersionedModel: modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName:string,
        parent_field: adltypes.fieldDesc,
        errors:  adltypes.errorList): void{

            //step-1
            for(let versionedP of leveledVersionedModel.Properties){
                const currentFieldDesc =  new adltypes.fieldDesc(versionedP.Name, parent_field);

                if(versionedP.isRemoved)continue;

                //step-1.1: execute conversion constraint, we always assume max of conversion constraint.
                const conversionConstraints = versionedP.getConversionConstraints();
                let c = (conversionConstraints.length > 0) ? conversionConstraints[0] : undefined;
                let target_changed = undefined;
                if(c != undefined){
                    const impl = this.machinery.getConversionConstraintImplementation(c.Name);
                    const ctx = createConstraintExecCtx(this.machinery, this.opts, c, versionedP.Name, currentFieldDesc,errors);
                    target_changed = impl.ConvertToVersioned(
                        ctx,
                        rootVersioned,
                        leveledVersioned,
                        rootNormalized,
                        leveledNormalized,
                        rootVersionedModel,
                        leveledVersionedModel,
                        rootNormalizedModel,
                        leveledNormalizedModel,
                        versionName);
                }

                //step-1.2: get the actual target model and property. Which can be an outcome of a conversion constraint
                const actual_normalizedP = (target_changed != undefined) ? target_changed.targetProperty : leveledNormalizedModel.getProperty(versionedP.Name);
                const actual_leveledNormalizedModel = (target_changed != undefined) ? target_changed.targetModel : leveledNormalizedModel;
                const actual_leveledNormalized = (target_changed != undefined) ? target_changed.target : leveledNormalized;

                //step-1.3: convert. only if
                // not manual
                // we actually have a target to work with
                // they are the same data type kind
                if(actual_normalizedP != undefined){ // type script compiler needs to see this as a stand alone if
                    if(!versionedP.isManaullyConverted || (versionedP.DataTypeKind != actual_normalizedP.DataTypeKind)){
                        this.auto_convert_normalized_versioned_property(
                            versionedP,
                            actual_normalizedP,
                            rootVersioned,
                            leveledVersioned,
                            rootNormalized,
                            actual_leveledNormalized,
                            rootVersionedModel,
                            leveledVersionedModel,
                            rootNormalizedModel,
                            actual_leveledNormalizedModel,
                            versionName,
                            currentFieldDesc,
                            errors);
                    }
               }

               //step-1.4: default
               const defaultingConstraints =  versionedP.getDefaultingConstraints();
               for(let c of defaultingConstraints){
                   const implementation = this.machinery.getDefaultingConstraintImplementation(c.Name);
                   // run it
                   const ctx = createConstraintExecCtx(this.machinery, this.opts, c, versionedP.Name, currentFieldDesc, errors);
                   implementation.Run(ctx, rootVersioned, leveledVersioned, rootVersionedModel, leveledVersionedModel)
               }
        }
    }

    // converts a normalized type to a versioned one
    private convert_normalized_versioned(
        normalized: any,
        versioned: any,
        apiModel: modeltypes.ApiModel,
        versionName:string,
        normalizedApiTypeModel: modeltypes.NormalizedApiTypeModel,
        versionedTypeModel: modeltypes.VersionedApiTypeModel,
        parent_field: adltypes.fieldDesc,
        errors:  adltypes.errorList): void{

        // run auto
        this.auto_convert_normalized_versioned(
            versioned,
            versioned,
            normalized,
            normalized,
            versionedTypeModel,
            versionedTypeModel,
            normalizedApiTypeModel,
            normalizedApiTypeModel,
            versionName,
            parent_field,
            errors);

        // run the imperative versioner
        // auto  already ran
        if(versionedTypeModel.VersionerName == adltypes.AUTO_VERSIONER_NAME) return;

       this.opts.logger.verbose(`spec versioner:${versionedTypeModel.VersionerName} version ${normalizedApiTypeModel.Name} => ${apiModel.Name}/${versionName}/${versionedTypeModel.Name}`);
        const imperative_versioner= apiModel.createSpecInstance(versionedTypeModel.VersionerName) as adltypes.Versioner<adltypes.Normalized, adltypes.Versioned>;

        // run it == TODO: metric collection here
        imperative_versioner.Convert(normalized as adltypes.Versioned, versioned as adltypes.Versioned, errors);

    }

    // note we run defaults in ts separate walk to allow cross references.
    // e.g. property default may depend on the value of another property which may yet to be set.
    // running in a saprate walk has a cost but allows more flixibility and less error prone
    // note 2: we keep track of root object to allow defaulting constraint to cross ref
    // other properties as needed
    private run_type_defaults(
                              root: any,
                              leveled: any,
                              rootApiTypeModel: modeltypes.ApiTypeModel,
                              leveledApiTypeModel: modeltypes.ApiTypeModel,
                              parent_field: adltypes.fieldDesc,
                              errors: adltypes.errorList): void{
        /* note we work with properties as they were defined, not properties
         * as they appear in the input object graph
         */
        for(let p of leveledApiTypeModel.Properties){
            if(p.isRemoved) continue; /* don't default a removed property*/

            const currentFieldDesc =  new adltypes.fieldDesc(p.Name, parent_field);
            const defaultingConstraints =  p.getDefaultingConstraints();

            for(let c of defaultingConstraints){
                const implementation = this.machinery.getDefaultingConstraintImplementation(c.Name);
                // run it
                const ctx = createConstraintExecCtx(this.machinery, this.opts, c, p.Name, currentFieldDesc,errors);
                implementation.Run(
                    ctx,
                    root,
                    leveled,
                    rootApiTypeModel,
                    leveledApiTypeModel)
            }

            if(leveled[p.Name] == undefined){
                this.opts.logger.verbose(`auto defaulting: found ${p.Name}/{leveledApiTypeModel.Name} as undefined, ignoring downlevels defaulting`);
                continue;
            }
            // complex + not undefined (we check because defaulting
            // may have choosen not to default it.
            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                this.run_type_defaults(root, leveled[p.Name], rootApiTypeModel, p.getComplexDataTypeOrThrow(), currentFieldDesc, errors);
                continue;
            }

            // if complex map then run for every key
            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap){
              for(const key of Object.keys(leveled[p.Name])){
                const walkField = new adltypes.fieldDesc(key, currentFieldDesc);
                if(leveled[p.Name] != undefined){
                    this.run_type_defaults(root, leveled[p.Name][key], rootApiTypeModel, p.getComplexDataTypeOrThrow(), walkField, errors)
                }
              }
            }

            // for each entry in the array.. default it
            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                for(let i =0; i < leveled[p.Name].length; i++){
                    const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
                    indexedFieldDesc.index = i;
                    this.run_type_defaults(root, leveled[p.Name][i], rootApiTypeModel, p.getComplexDataTypeOrThrow(), indexedFieldDesc, errors);
                }
            }
        }
    }

    // runs defaults for a versioned type
    default_versioned(payload: string | any, apiName: string, versionName: string, versionedApiTypeName: string, errors: adltypes.errorList): void{
        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const versionModel = apiModel.getVersion(versionName);
        if(!versionModel) throw new InvalidApiVersionModel(versionName);

        const versionedTypeModel = versionModel.getVersionedType(versionedApiTypeName);
        if(!versionedTypeModel) throw new InvalidApiTypeModel(versionedApiTypeName);

        const versionedTyped = adltypes.isComplex(payload) ? payload : JSON.parse(payload);
        const rootField = adltypes.getRootFieldDesc();

        this.run_type_defaults(versionedTyped, versionedTyped, versionedTypeModel, versionedTypeModel, rootField, errors);
    }

    // runs defaults for a normalized type
    default_normalized(payload: string | any, apiName: string, normalizedApiTypeName: string, errors: adltypes.errorList): void{
        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const normalizedApiTypeModel = apiModel.getNormalizedApiType(normalizedApiTypeName);
        if(!normalizedApiTypeModel) throw new InvalidApiTypeModel(normalizedApiTypeName);

        const normalizedTyped = adltypes.isComplex(payload) ? payload : JSON.parse(payload);

        const rootField = adltypes.getRootFieldDesc();

        this.run_type_defaults(normalizedTyped, normalizedTyped, normalizedApiTypeModel,normalizedApiTypeModel, rootField, errors);

        // if this type uses auto normalization then we are done working
        // we have just ran it.
        if(normalizedApiTypeModel.NormalizerName == adltypes.AUTO_NORMALIZER_NAME)
            return;

        this.opts.logger.verbose(`spec normalizer:${normalizedApiTypeModel.NormalizerName} is defaulting ${apiModel.Name}/${normalizedApiTypeModel.Name}`);
        const imperative_normalizer = apiModel.createSpecInstance(normalizedApiTypeModel.NormalizerName) as adltypes.Normalizer<adltypes.Normalized>;

        // run it == TODO: metric collection here
        imperative_normalizer.Default(normalizedTyped, errors);
    }


    // walks the object graph finds validation constraints and run them
    private validate(
        root:   any,
        leveled: any,
        existingRoot: any| undefined,
        existingLeveled: any | undefined,
        rootApiTypeModel: modeltypes.ApiTypeModel,
        leveledApiTypeModel: modeltypes.ApiTypeModel,
        parent_field: adltypes.fieldDesc,
        errors: adltypes.errorList):void{

        for(let p of leveledApiTypeModel.Properties){
            const currentFieldDesc =  new adltypes.fieldDesc(p.Name, parent_field);
            // if field is missing. this will happen if conversion logic is not
            // well made. this error will be caught in roundtripping phase.
            // we have to be careful, optional fields won't have value
            const exist = leveled.hasOwnProperty(p.Name);

            if(!p.isOptional && !exist){
                errors.push(machinerytypes.createValidationError(`field ${p.Name} is missing`, currentFieldDesc));
                continue;
            }

            if(!exist) continue; // if the field is not on the input object then we can not do anything more

            // nullability
            if(leveled[p.Name] == null && !p.isNullable){
               errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. null is not expected`, currentFieldDesc));
                continue;
            }

            if(leveled[p.Name] == null) continue; // if the field value is null then there is nothing more we can do here

            // basic data type match validation
            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex  && !adltypes.isComplex(leveled[p.Name])){
                errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected complex object`, currentFieldDesc));
                continue;
            }

            if(p.isMap()  && !adltypes.isComplex(leveled[p.Name])){
                errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected a map`, currentFieldDesc));
                continue;
            }

            if(p.isArray() && !adltypes.isArray(leveled[p.Name])){
                errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected array`, currentFieldDesc));
                continue;
            }

            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar && p.DataTypeName != (typeof leveled[p.Name])){
                errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected ${p.DataTypeName}`, currentFieldDesc));
                continue;
            }

            // run the validation constraints if any
            const validationConstraints =  p.getValidationConstraints();
            // run validation constraint
            for(let c of validationConstraints){
                const implementation = this.machinery.getValidationConstraintImplementation(c.Name);
                const ctx = createConstraintExecCtx(this.machinery, this.opts, c, p.Name, currentFieldDesc,errors);
                implementation.Run(
                    ctx,
                    root,
                    leveled,
                    existingRoot,
                    existingLeveled,
                    rootApiTypeModel,
                    leveledApiTypeModel,
                    false);
            }
            // maps are a bit tricky, we need to validate
            // keys
            // values
            if(p.isMap()){
                const keyConstranints = p.MapKeyConstraints;
                const valueConstraints = p.MapValueConstraints;
                for(const key of Object.keys(leveled[p.Name])){
                    const walkField = new adltypes.fieldDesc(key, currentFieldDesc);
                    const valueIsNull = (leveled[p.Name][key] == null);
                    const dataTypeModel = p.DataTypeModel as modeltypes.PropertyMapDataType;

                    // nullable values
                    if(valueIsNull && !dataTypeModel.isValueNullable){
                       errors.push(machinerytypes.createValidationError(`field ${p.Name}[${key}] is invalid. Unexpected null`, walkField));
                       continue;
                    }

                    if(valueIsNull) continue; // value is null, nothing more to do here

                    // value can not be an array
                    if(adltypes.isArray(leveled[p.Name][key])){ // value can not be an array
                       errors.push(machinerytypes.createValidationError(`field ${p.Name}[${key}] is invalid. Unexpected array`, walkField));
                       continue;
                    }

                    // value is complex, but we don't expect complex
                    if(adltypes.isComplex(leveled[p.Name][key]) && p.DataTypeKind == modeltypes.PropertyDataTypeKind.Map){
                       errors.push(machinerytypes.createValidationError(`field ${p.Name}[${key}] is invalid. Expected scalar`, walkField));
                       continue;
                    }

                    // value is simple, but we expect complex objext
                    if(!adltypes.isComplex(leveled[p.Name][key]) && p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap){
                        errors.push(machinerytypes.createValidationError(`field ${p.Name}[${key}] is invalid. Expected complex object`, walkField));
                        continue;
                    }

                    // scalar value data type needs to match
                    if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar && p.getMapValueDataTypeNameOrThrow() != (typeof leveled[p.Name][key])){
                        errors.push(machinerytypes.createValidationError(`field ${p.Name}[${key}] is invalid. Expected ${p.getMapValueDataTypeNameOrThrow()}`, walkField));
                        continue;
                    }

                    // scalary key needs to match
                    if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar && p.getMapKeyDataTypeNameOrThrow() != (typeof key)){
                        errors.push(machinerytypes.createValidationError(`key ${p.Name}/${key} is invalid. Expected ${p.getMapValueDataTypeNameOrThrow()}`, walkField));
                        continue;
                    }

                    // run constraints for key
                    for(let c of keyConstranints){
                        const implementation = this.machinery.getValidationConstraintImplementation(c.Name);
                        const ctx = createConstraintExecCtx(this.machinery, this.opts, c, key, walkField, errors);
                        implementation.Run(
                            ctx,
                            root,
                            leveled[p.Name][key],
                            existingRoot,
                            (existingLeveled && existingLeveled[p.Name]) ? existingLeveled[p.Name][key] : undefined,
                            rootApiTypeModel,
                            leveledApiTypeModel,
                            true);
                    }

                    // run constaint for value
                     for(let c of valueConstraints){
                        const implementation = this.machinery.getValidationConstraintImplementation(c.Name);
                        const ctx = createConstraintExecCtx(this.machinery, this.opts, c, key, walkField, errors);
                        implementation.Run(
                            ctx,
                            root,
                            leveled[p.Name][key],
                            existingRoot,
                            (existingLeveled && existingLeveled[p.Name]) ? existingLeveled[p.Name][key] : undefined,
                            rootApiTypeModel,
                            (p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap) ? p.getComplexDataTypeOrThrow() : leveledApiTypeModel,
                            false);
                    }

                    // if this is a complex map then we need to run value object
                    if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap){
                        this.validate(
                            root,
                            leveled[p.Name][key],
                            existingRoot,
                            (existingLeveled && existingLeveled[p.Name]) ? existingLeveled[p.Name][key] : undefined,
                            rootApiTypeModel,
                            p.getComplexDataTypeOrThrow(),
                            walkField,
                            errors);
                        continue;
                    }
                }
             continue;
            }
            // complex data type
            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                this.validate(
                    root,
                    leveled[p.Name],
                    existingRoot,
                    (existingLeveled) ? existingLeveled[p.Name]: undefined,
                    rootApiTypeModel,
                    p.getComplexDataTypeOrThrow(),
                    currentFieldDesc,
                    errors);
                continue;
            }

            // run an array
            if(p.isArray()){
                for(let i =0; i < leveled[p.Name].length; i++){
                    const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
                    indexedFieldDesc.index = i;

                    // null element
                    const elementIsNull = (leveled[p.Name][i] == null);
                    const elementDataTypeModel = p.DataTypeModel as modeltypes.PropertyArrayDataType;

                    if(elementIsNull && !elementDataTypeModel.isElementNullable){
                        errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Unexpected null`, indexedFieldDesc));
                        continue;
                    }
                    if(elementIsNull) continue; // nothing more can be done

                    if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                        // if entry in array does not match expected data type
                        if(leveled[p.Name][i] != undefined && leveled[p.Name][i] != null && !adltypes.isComplex(leveled[p.Name][i])){
                            errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected complex object`, indexedFieldDesc));
                            continue;
                        }

                        // now validate it as complex object
                        this.validate(
                            root,
                            leveled[p.Name][i],
                            existingRoot,
                            (existingLeveled && existingLeveled[p.Name].length > i ) ? existingLeveled[p.Name][i]: undefined,
                            rootApiTypeModel,
                            p.getComplexDataTypeOrThrow(),
                            indexedFieldDesc,
                            errors);

                    }else{
                       const elementModel = elementDataTypeModel as modeltypes.PropertySimpleArrayDataType;
                        if(leveled[p.Name][i] != null && elementModel.ElementDataTypeName != (typeof leveled[p.Name][i])){
                            errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected ${p.DataTypeName}`, indexedFieldDesc));
                            continue;
                        }

                        // run array elements constraint
                        const elementValidationConstraints =  elementModel.ElementValidationConstraints;
                        for(let c of elementValidationConstraints){
                            const implementation = this.machinery.getValidationConstraintImplementation(c.Name);
                            const ctx = createConstraintExecCtx(this.machinery, this.opts, c, p.Name, indexedFieldDesc,errors);
                                implementation.Run(
                                    ctx,
                                    root,
                                    leveled[p.Name][i],
                                    existingRoot,
                                    (existingLeveled && existingLeveled[p.Name].length > i ) ? existingLeveled[p.Name][i]: undefined,
                                    rootApiTypeModel,
                                    leveledApiTypeModel,
                                    true);
                        }
                    }
                }
            }
        }
    }

    validate_normalized_onupdate(payload: string | any, existingPayload: string | any, apiName: string, normalizedApiTypeName: string, errors: adltypes.errorList):void{
        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const normalizedApiTypeModel = apiModel.getNormalizedApiType(normalizedApiTypeName);
        if(!normalizedApiTypeModel) throw new InvalidApiTypeModel(normalizedApiTypeName);

        const normalizedTyped = adltypes.isComplex(payload) ? payload : JSON.parse(payload);
        const existingNormalizedTyped = adltypes.isComplex(existingPayload) ? existingPayload : JSON.parse(existingPayload);
        const rootField = adltypes.getRootFieldDesc();
        this.validate(normalizedTyped, normalizedTyped, existingNormalizedTyped, existingNormalizedTyped, normalizedApiTypeModel, normalizedApiTypeModel, rootField, errors);

        if(normalizedApiTypeModel.NormalizerName== adltypes.AUTO_NORMALIZER_NAME) return;

        this.opts.logger.verbose(`spec normalizer:${normalizedApiTypeModel.NormalizerName} is validating ${apiModel.Name}/${normalizedApiTypeModel.Name}`);
        const imperative_normalizer = apiModel.createSpecInstance(normalizedApiTypeModel.NormalizerName) as adltypes.Normalizer<adltypes.Normalized>;
        imperative_normalizer.Validate(existingPayload, normalizedTyped, errors);
    }

    validate_normalized_oncreate(payload: string | any, apiName: string, normalizedApiTypeName: string, errors: adltypes.errorList):void{
        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const normalizedApiTypeModel = apiModel.getNormalizedApiType(normalizedApiTypeName);
        if(!normalizedApiTypeModel) throw new InvalidApiTypeModel(normalizedApiTypeName);

        const normalizedTyped = adltypes.isComplex(payload) ? payload : JSON.parse(payload);
        const rootField = adltypes.getRootFieldDesc();
        this.validate(normalizedTyped, normalizedTyped, undefined /* on create we won't have existing*/, undefined, normalizedApiTypeModel, normalizedApiTypeModel, rootField, errors);
        if(normalizedApiTypeModel.NormalizerName== adltypes.AUTO_NORMALIZER_NAME) return;

        this.opts.logger.verbose(`custom normalizer:${normalizedApiTypeModel.NormalizerName} is validating ${apiModel.Name}/${normalizedApiTypeModel.Name}`);
        const imperative_normalizer = apiModel.createSpecInstance(normalizedApiTypeModel.NormalizerName) as adltypes.Normalizer<adltypes.Normalized>;
        imperative_normalizer.Validate(undefined, normalizedTyped, errors);
    }

    // normalize: normalizes payload as the following:
    // converts it to the normalized counterpart
    // defaults
    // validates
    normalize(payload: string | any,
              apiName: string,
              versionName: string,
              versionedApiTypeName: string,
              errors: adltypes.errorList): adltypes.Normalized {

        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const versionModel = apiModel.getVersion(versionName);
        if(!versionModel) throw new InvalidApiVersionModel(versionName);

        const versionedTypeModel = versionModel.getVersionedType(versionedApiTypeName);
        if(!versionedTypeModel) throw new InvalidApiTypeModel(versionedApiTypeName);

        // api won't load if the reference by name does not exist.
        const normalizedTypeModel = apiModel.getNormalizedApiType(versionedTypeModel.NormalizedApiTypeName) as modeltypes.NormalizedApiTypeModel;
        const versionedTyped =  ("string" !== typeof payload) ? payload : JSON.parse(payload);
        const rootField = adltypes.getRootFieldDesc();

        /* TODO: @khenidak optimize
         * we currently walk the object graph too many time
         * walk for missing keys (done)
         * walk for extra keys (done)
         * walk for auto conversion // we have to separete auto from running constraints. because we are not sure of cross reference dependability
         * walk for running conversion constraints
         * walk for running defaulting constraints
         * walk for running validation constraints
         * we can compress the above into few walks by the following
         * Alpha: Missing and extra keys as part of the auto conversion (-2 walks)
         * beta: surface hasPropertiesWith*Constraints() (where *=>conversion, defaulting, validation) on complex objects, and walk *only* when this value is true.
         * gama: (long term)
         * we currently separate the walks because we want spec author to assume that *autoAction* is done. e.g if i am defaulting then i can saftely
         * assume that all the auto conversion and auto defaulting has ran. eg: i can saftely read other parts of the object graph. if we can limit this
         * supportability. then we can compress the 3 walks into one. but it will take away a big -important - feature for perf.
         * the decision on gama must depend on our performance goals.
         */

        // with the rest of valiation
        const normalized = {} as adltypes.Normalized;

        this.convert_versioned_normalized(versionedTyped, normalized, apiModel, versionModel.Name, versionedTypeModel, normalizedTypeModel, rootField, errors);
        // check if we have extra, missing keys etc
        if(errors.length > 0) return normalized; // can't go to next phase without clean errors

        this.default_normalized(normalized, apiName, normalizedTypeModel.Name, errors);
        this.validate_normalized_oncreate(normalized, apiName, versionedTypeModel.NormalizedApiTypeName, errors);

        return normalized;
    }

    // converts a normalized type to a versioned one
    // TODO: better name?
    denormalize(normalizedPayload: string | any,
                                                    apiName: string,
                                                    tgtVersionName: string,
                                                    tgtVersionedApiTypeName: string,
                                                    errors: adltypes.errorList): adltypes.Versioned {

        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const versionModel = apiModel.getVersion(tgtVersionName);
        if(!versionModel) throw new InvalidApiVersionModel(tgtVersionName);

        const versionedTypeModel = versionModel.getVersionedType(tgtVersionedApiTypeName);
        if(!versionedTypeModel) throw new InvalidApiTypeModel(tgtVersionedApiTypeName);

        // api won't load if the reference by name does not exist.
        const normalizedTypeModel = apiModel.getNormalizedApiType(versionedTypeModel.NormalizedApiTypeName) as modeltypes.NormalizedApiTypeModel;
        const normalizedTyped = ("string" !== typeof normalizedPayload) ? normalizedPayload : JSON.parse(normalizedPayload);

        const rootField = adltypes.getRootFieldDesc();

        const versionedTyped =  {} as adltypes.Versioned;
        this.convert_normalized_versioned(normalizedTyped, versionedTyped, apiModel, tgtVersionName, normalizedTypeModel, versionedTypeModel, rootField, errors);

        return versionedTyped;
    }

    // converts from one api version to another
    convert(payload: string | any,
            apiName: string,
            srcVersionName: string,
            srcVersionedApiTypeName: string,
            tgtVersionName: string,
            tgtVersionedApiTypeName: string,
            errors: adltypes.errorList): adltypes.Versioned{

        // round trip
        const normalized = this.normalize(payload, apiName, srcVersionName, srcVersionedApiTypeName, errors);
        const versioned = this.denormalize(JSON.stringify(normalized), apiName, tgtVersionName, tgtVersionedApiTypeName, errors);
        return versioned;
    }

    // create an instance based on a model
    private build_instance(instance: adltypes.Normalized, leveledApiTypeModel: modeltypes.ApiTypeModel, parent_field: adltypes.fieldDesc /* TODO: complete:bool i.e. fuzzed */){
        // parent_field should be used to do verbose logging.. TODO
        for(let p of leveledApiTypeModel.Properties){
            const currentFieldDesc =  new adltypes.fieldDesc(p.Name, parent_field);
            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar){
                if(p.DataTypeName == "number"){
                    (<any>instance)[p.Name] = 0 as number;
                    continue;
                }

                if(p.DataTypeName == "string"){
                    (<any>instance)[p.Name] = "" as string;
                    continue;
                }
            }

            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                const subModel = {};
                (<any>instance)[p.Name] = subModel;
                this.build_instance(subModel as adltypes.Normalized, p.getComplexDataTypeOrThrow(), currentFieldDesc);
                continue;
            }

            if(p.isArray()) {
                const defaultLength = 3; // arbitrary length /*TODO: defaulter and validators should set this correctly*/
                (<any>instance)[p.Name] = [];
                for(let i =0; i < defaultLength; i++){
                    const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
                    indexedFieldDesc.index = i;

                    if(p.DataTypeName == "number"){
                        (<any>instance)[p.Name][i] = 0 as number;
                        continue;
                    }
                    if(p.DataTypeName == "string"){
                         (<any>instance)[p.Name][i] = "" as string;
                            continue;
                    }
                    if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                        const elementModel = {};
                        (<any>instance)[p.Name][i] = elementModel;
                        this.build_instance((elementModel as adltypes.Normalized), p.getComplexDataTypeOrThrow(), indexedFieldDesc);
                        continue;
                    }
                }

            }
        }
    }


    create_normalized_instance(apiName: string, normalizedApiTypeName: string /* TODO: complete:bool i.e. fuzzed */ ): adltypes.Normalized {
        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const normalizedApiTypeModel = apiModel.getNormalizedApiType(normalizedApiTypeName);
        if(!normalizedApiTypeModel) throw new InvalidApiTypeModel(normalizedApiTypeName);

        const rootField = adltypes.getRootFieldDesc();
        const normalizedTyped = {} as adltypes.Normalized;
        this.build_instance(normalizedTyped, normalizedApiTypeModel, rootField);
        // default it
        this.default_normalized(normalizedTyped, apiName, normalizedApiTypeName, new adltypes.errorList() /* we don't report errors here, should we?*/);
        return normalizedTyped;
    }

    create_versioned_instance(apiName: string, versionName: string, versionedApiTypeName: string, /* TODO: complete:bool i.e. fuzzed */): adltypes.Versioned{
        const apiModel = this.store.getApiInfo(apiName)
        if(!apiModel) throw new InvalidErrorApiModel(apiName);

        const versionModel = apiModel.getVersion(versionName);
        if(!versionModel) throw new InvalidApiVersionModel(versionName);

        const versionedTypeModel = versionModel.getVersionedType(versionedApiTypeName);
        if(!versionedTypeModel) throw new InvalidApiTypeModel(versionedApiTypeName);

        const normalizedTypeName = versionedTypeModel.NormalizedApiTypeName;

        const normalizedTyped = this.create_normalized_instance(apiName, normalizedTypeName);
        const versionedTyped = this.denormalize(normalizedTyped, apiName, versionName, versionedTypeModel.Name, new adltypes.errorList() /* we don't report errors here, should we?*/);

        this.default_versioned(versionedTyped, apiName, versionName, versionedTypeModel.Name, new adltypes.errorList() /*same*/);
        return versionedTyped;
    }
}
