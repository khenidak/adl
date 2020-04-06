import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from './machinery.types'

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
import * as modeltypes from '../model/module'

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


    private run_convertion_constraints_versioned_normalized(
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any | undefined,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel | undefined,
        versionName: string,
        parent_field: adltypes.fieldDesc,
        errors:  adltypes.errorList):void{
        for (let propertyName of Object.keys(leveledVersioned)){
            const currentFieldDesc =  new adltypes.fieldDesc(propertyName, parent_field);
            const versionedP = leveledVersionedModel.getProperty(propertyName) as modeltypes.ApiTypePropertyModel;
            const conversionConstraints = versionedP.getConversionConstraints();
            for(const c of conversionConstraints){
                const impl = this.machinery.getConversionConstraintImplementation(c.Name);
                const ctx = machinerytypes.createConstraintExecCtx(this.machinery, this.opts, c.Name, c.Arguments, propertyName, currentFieldDesc,errors);
                impl.ConvertToNormalized(
                    ctx,
                    this,
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


            if(adltypes.isComplex(leveledVersioned[propertyName])){
                if(versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                    this.run_convertion_constraints_versioned_normalized(
                        rootVersioned,
                        leveledVersioned[propertyName],
                        rootNormalized,
                        leveledNormalized ? leveledNormalized[propertyName] : undefined,
                        rootVersionedModel,
                        versionedP.getComplexDataTypeOrThrow(),
                        rootNormalizedModel,
                        leveledNormalizedModel ? leveledNormalizedModel.getProperty(propertyName)?.getComplexDataTypeOrThrow() : undefined,
                        versionName,
                        currentFieldDesc,
                        errors);
                    continue;
                }

                // process complex map
                if(versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap){
                    for(const key of Object.keys(leveledVersioned[propertyName])){
                        const walkField =  new adltypes.fieldDesc(key, currentFieldDesc);
                        let leveledNormalizedValue:any | undefined = undefined;
                        let currentNormalizedModel:  modeltypes.ApiTypeModel | undefined = undefined;
                        if(leveledNormalized &&  leveledNormalized[propertyName] && leveledNormalized[propertyName][key]){
                            leveledNormalizedValue = leveledNormalized[propertyName][key];
                        }
                        // TODO: this will be changed as we model properties and property data type the right way
                        if(leveledNormalizedModel != undefined &&
                           leveledNormalizedModel.getProperty(propertyName) != undefined &&
                           leveledNormalizedModel.getProperty(propertyName)?.getComplexDataTypeOrThrow().getProperty(key) != undefined){
                           const leveldP = (leveledNormalizedModel as modeltypes.ApiTypeModel).getProperty(propertyName) as modeltypes.ApiTypePropertyModel;
                           const leveledKeydP = leveldP.getComplexDataTypeOrThrow().getProperty(key) as modeltypes.ApiTypePropertyModel;
                           currentNormalizedModel = leveledKeydP.getComplexDataTypeOrThrow();
                        }

                        this.run_convertion_constraints_versioned_normalized(
                            rootVersioned,
                            leveledVersioned[propertyName][key],
                            rootNormalized,
                            leveledNormalizedValue,
                            rootVersionedModel,
                            versionedP.getComplexDataTypeOrThrow(),
                            rootNormalizedModel,
                            currentNormalizedModel,
                            versionName,
                            walkField,
                            errors);
                    }
                    continue;
                }

            // we don't run through arrays in ConversionConstraints
            }
        }
    }
    // runs auto conversion process. the auto conversion process walks
    // the object graph and find:
    // property name and datatype that are equal => copy data from versioned=>normalized
    // and DOES NOT HAVE  NoAutoConversion constraint
    auto_convert_versioned_normalized(
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

        // !!!!! these keys are filtered, does not have extra keys
        for (let propertyName of Object.keys(leveledVersioned)) {
            const currentFieldDesc =  new adltypes.fieldDesc(propertyName, parent_field);

            const versionedP = leveledVersionedModel.getProperty(propertyName) as modeltypes.ApiTypePropertyModel;

            // no auto conversion?
            if(versionedP.isManaullyConverted){
                this.opts.logger.verbose(`auto-normalize: property ${propertyName} of versioned model ${leveledVersionedModel.Name} is NoAutoConvert, ignoring`);
                continue;
            }

            const normalizedP = leveledNormalizedModel.getProperty(propertyName);
            if(normalizedP == undefined){
                    this.opts.logger.info(`auto-normalize: property ${propertyName} of versioned model ${leveledVersionedModel.Name} does not exist in normalized model ${leveledNormalizedModel.Name}, ignoring`);
                    continue; // this property does not exist in normalized
             }

            // match data types for models
            if(versionedP.DataTypeKind != normalizedP.DataTypeKind){
                this.opts.logger.info(`auto-normalize: property ${propertyName} has different DataTypeKind on versioned and normalized models, ignoring`);
                continue;
            }
/* -- removed we copy and let validation deal with mismatches
            // match data types
            if(adltypes.isScalar(leveledVersioned[propertyName]) && normalizedP.DataTypeKind != modeltypes.PropertyDataTypeKind.Scalar){
                this.opts.logger.info(`auto-normalize: property ${propertyName} is scalar in input but not on normalized model ${leveledNormalizedModel.Name}, ignoring`);
                continue;
             }

            if(adltypes.isComplex(leveledVersioned[propertyName]) &&
               normalizedP.DataTypeKind != modeltypes.PropertyDataTypeKind.Complex &&
               !normalizedP.isMap()){
                this.opts.logger.verbose(`auto-normalize: property ${propertyName} is complex in input but not on normalized model ${leveledNormalizedModel.Name}, ignoring`);
                continue;
             }

             if(adltypes.isArray(leveledVersioned[propertyName]) && !normalizedP.isArray()){
                 this.opts.logger.info(`auto-normalize: property ${propertyName} is array in input but not on normalized model ${leveledNormalizedModel.Name}, ignoring`);
                continue;
             }
*/

            // if it is null copy as is
            if(leveledVersioned[propertyName] == null){
                 this.opts.logger.verbose(`auto-normalize: property ${propertyName} copied as null value`);
                leveledNormalized[propertyName] = leveledVersioned[propertyName];
                continue;
            }

            //copy as as scalar
            if(adltypes.isScalar(leveledVersioned[propertyName])){
                leveledNormalized[propertyName] = leveledVersioned[propertyName];
                continue;
            }

            // run it as an object
            if(adltypes.isComplex(leveledVersioned[propertyName])){
                leveledNormalized[propertyName] = {}; // define empty object, we can do that comfortably here because we check for nulls
                if(normalizedP.isMap()){
                    for(const key of Object.keys(leveledVersioned[propertyName])){
                        if(leveledVersioned[propertyName][key] == null){
                            leveledNormalized[propertyName][key] = leveledVersioned[propertyName][key];
                            continue;
                        }
                        if(adltypes.isScalar(leveledVersioned[propertyName][key])){
                            leveledNormalized[propertyName][key] = leveledVersioned[propertyName][key];
                            continue;
                        }
                        // input must be a complx object
                        // if target is not complex map then copy as is
                        if(normalizedP.DataTypeKind != modeltypes.PropertyDataTypeKind.ComplexMap){
                            leveledNormalized[propertyName][key] = leveledVersioned[propertyName][key];
                            continue;
                        }

                        // if target is a complex map
                        leveledNormalized[propertyName][key] = {};
                        this.opts.logger.info(`auto-normalize: attempting to process property ${propertyName} as complex map`);
                        const walkField =  new adltypes.fieldDesc(key, currentFieldDesc);
                        this.auto_convert_versioned_normalized(
                                rootVersioned,
                                leveledVersioned[propertyName][key],
                                rootNormalized,
                                leveledNormalized[propertyName][key],
                                rootVersionedModel,
                                versionedP.getComplexDataTypeOrThrow(),
                                rootNormalizedModel,
                                normalizedP.getComplexDataTypeOrThrow(),
                                versionName,
                                walkField,
                                errors);
                        continue;
                    }
               }

                // if target is complex then process
               if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                    this.auto_convert_versioned_normalized(
                        rootVersioned,
                        leveledVersioned[propertyName],
                        rootNormalized,
                        leveledNormalized[propertyName],
                        rootVersionedModel,
                        versionedP.getComplexDataTypeOrThrow(),
                        rootNormalizedModel,
                        normalizedP.getComplexDataTypeOrThrow(),
                        versionName,
                        currentFieldDesc,
                        errors);
                        continue;
                }

                // we don't know what is that, copy as is, let the validation deal with it
                leveledNormalized[propertyName] = leveledVersioned[propertyName];
                continue;
            }

        if(adltypes.isArray(leveledVersioned[propertyName])){
            leveledNormalized[propertyName] = [];
            for(let i =0; i < leveledVersioned[propertyName].length; i++){
                // create indexed field desc
                const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
                indexedFieldDesc.index = i;
                // here we have to copy anyway to maintain array size. (versioned.len == normalized.len)
                // even if they are not equal data types (validation will validate it).
                if(adltypes.isComplex(leveledVersioned[propertyName][i])){
                    leveledNormalized[propertyName][i] = {};
                    if(normalizedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                        this.auto_convert_versioned_normalized(
                            rootVersioned,
                            leveledVersioned[propertyName][i],
                            rootNormalized,
                            leveledNormalized[propertyName][i],
                            rootVersionedModel,
                            versionedP.getComplexDataTypeOrThrow(),
                            rootNormalizedModel,
                            normalizedP.getComplexDataTypeOrThrow(),
                            versionName,
                            indexedFieldDesc,
                            errors);
                    }else{
                        leveledNormalized[propertyName][i] = leveledVersioned[propertyName][i];
                        continue;
                    }
                }else{
                    leveledNormalized[propertyName][i] = leveledVersioned[propertyName][i];
                    continue;
                }
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

            // run conversion constraints
            this.run_convertion_constraints_versioned_normalized(
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
        if(versionedTypeModel.VersionerName == adltypes.AUTO_VERSIONER_NAME) return;

        this.opts.logger.info(`spec versioner:${versionedTypeModel.VersionerName} normalize ${apiModel.Name}/${versionName}/${versionedTypeModel.Name} => ${normalizedApiTypeModel.Name}`);
        const imperative_versioner  = apiModel.createSpecInstance(versionedTypeModel.VersionerName) as adltypes.Versioner<adltypes.Normalized, adltypes.Versioned>;
        // run it == TODO: metric collection here
        imperative_versioner.Normalize(versioned as adltypes.Versioned, normalized as adltypes.Versioned, errors);
    }

    // runs constraints for denormalizsation process
    private run_convertion_constraints_normalized_versioned(
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any | undefined,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel | undefined,
        versionName: string,
        parent_field: adltypes.fieldDesc,
        errors:  adltypes.errorList):void{

        for(const versionedP of leveledVersionedModel.Properties){
            const currentFieldDesc =  new adltypes.fieldDesc(versionedP.Name, parent_field);
            const conversionConstraints = versionedP.getConversionConstraints();
            for(const c of conversionConstraints){
                const impl = this.machinery.getConversionConstraintImplementation(c.Name);
                const ctx = machinerytypes.createConstraintExecCtx(this.machinery, this.opts, c.Name, c.Arguments, versionedP.Name, currentFieldDesc,errors);
                impl.ConvertToVersioned(
                    ctx,
                    this,
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

            //isComplex(..) ensure that the value in property is not undefined.
            if(adltypes.isComplex(leveledVersioned[versionedP.Name]) && versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap){
                for(const key of Object.keys(leveledVersioned[versionedP.Name])){
                    const walkField =  new adltypes.fieldDesc(key, currentFieldDesc);
                    // we assume here that auto converter did the right thing ensuring that values copied
                    // are of correct type
                    this.run_convertion_constraints_normalized_versioned(
                        rootVersioned,
                        leveledVersioned[versionedP.Name][key],
                        rootNormalized,
                        (leveledNormalized && leveledNormalized[versionedP.Name])? leveledNormalized[versionedP.Name][key] : undefined,
                        rootVersionedModel,
                        versionedP.getComplexDataTypeOrThrow(),
                        rootNormalizedModel,
                        leveledNormalizedModel ? leveledNormalizedModel.getProperty(versionedP.Name)?.getComplexDataTypeOrThrow() : undefined,
                        versionName,
                        currentFieldDesc,
                        errors);

                }
            }

            if(adltypes.isComplex(leveledVersioned[versionedP.Name]) && versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                this.run_convertion_constraints_normalized_versioned(
                    rootVersioned,
                    leveledVersioned[versionedP.Name],
                    rootNormalized,
                    leveledNormalized ? leveledNormalized[versionedP.Name] : undefined,
                    rootVersionedModel,
                    versionedP.getComplexDataTypeOrThrow(),
                    rootNormalizedModel,
                    leveledNormalizedModel ? leveledNormalizedModel.getProperty(versionedP.Name)?.getComplexDataTypeOrThrow() : undefined,
                    versionName,
                    currentFieldDesc,
                    errors);
            }
            // we don't run through arrays in ConversionConstraints
        }
    }

    // walks the object graph and copies properties (that match name and type)
    // into the versioned type
    auto_convert_normalized_versioned(
        rootVersioned: any,
        versioned: any,
        rootNormalized: any,
        normalized: any,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        normalizedApiTypeModel: modeltypes.ApiTypeModel,
        rootVersionedModel: modeltypes.ApiTypeModel,
        versionedTypeModel: modeltypes.ApiTypeModel,
        versionName:string,
        parent_field: adltypes.fieldDesc,
        errors:  adltypes.errorList): void{

            const log_prefix = `auto de-normalizing ${normalizedApiTypeModel.Name} => ${versionName}/${versionedTypeModel.Name}`
            // walk the keys of normalized (source)
            for(let propertyName of Object.keys(normalized)){
                const currentFieldDesc =  new adltypes.fieldDesc(propertyName, parent_field);

                // !!IMPORTANT !!! we are walking all the keys in source, assuming that
                // source is clean, e.g no extra fields, no garbage.

                const tgtP = versionedTypeModel.getProperty(propertyName); // name has changed, property remaped, removed etc.
                if(!tgtP)   continue;

                if(tgtP.isRemoved) continue; // property is expliclity set to remove
                if(tgtP.isManaullyConverted) continue; // property is not automatically convertable

                const srcP = normalizedApiTypeModel.getProperty(propertyName);
                if(!srcP){
                    // this mean data has been stored then normalized model has changed __big__ only imperative code can deal with it
                    this.opts.logger.wrn(`${log_prefix}: src property ${propertyName} does not exist in source normalized model, auto converter is ignoring it`);
                    continue;
                }

                //if source has no value then there is no point of copy
                if(normalized[propertyName] == undefined)
                    continue;

                if(tgtP.DataTypeKind != srcP.DataTypeKind)//not of same kind
                    continue;

                // TODO: null processing

                // now we know that both are of same data type kind and name.. copy
                if(srcP.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar){
                    if(srcP.DataTypeName == tgtP.DataTypeName){
                        versioned[propertyName] = normalized[propertyName];
                        continue;
                    }
                }

                // map
                if(srcP.isMap()){
                    versioned[propertyName] = {};
                    // match data type for key
                    if(srcP.getMapKeyDataTypeNameOrThrow() != tgtP.getMapKeyDataTypeNameOrThrow()){
                        this.opts.logger.verbose(`${log_prefix} map${propertyName} has different keydatatype ${srcP.getMapKeyDataTypeNameOrThrow()}!=${tgtP.getMapKeyDataTypeNameOrThrow()}, ignoring`);
                        continue;
                    }
                    for(const key of Object.keys(normalized[propertyName])){
                        const walkField = new adltypes.fieldDesc(key, currentFieldDesc);
                        if(srcP.DataTypeKind == modeltypes.PropertyDataTypeKind.Map){
                            // should we compare value data type name here?
                            versioned[propertyName][key] = normalized[propertyName][key];
                        }else{
                            this.opts.logger.verbose(`${log_prefix} found a complex map in ${propertyName} ${versionedTypeModel.Name}`);
                            versioned[propertyName][key] = {}
                            this.auto_convert_normalized_versioned(
                                rootVersioned,
                                versioned[propertyName][key],
                                rootNormalized,
                                normalized[propertyName][key],
                                rootNormalizedModel,
                                srcP.getComplexDataTypeOrThrow(),
                                rootVersionedModel,
                                tgtP.getComplexDataTypeOrThrow(),
                                versionName,
                                walkField,
                                errors);
                        }
                    }
                    continue;
                }
                // run it as an object
                if(srcP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                    versioned[propertyName] = {}; // define empty object
                    this.auto_convert_normalized_versioned(
                        rootVersioned,
                        versioned[propertyName],
                        rootNormalized,
                        normalized[propertyName],
                        rootNormalizedModel,
                        srcP.getComplexDataTypeOrThrow(),
                        rootVersionedModel,
                        tgtP.getComplexDataTypeOrThrow(),
                        versionName,
                        currentFieldDesc,
                        errors);
                    continue;
                }

                // if src and target are arrays
                if(srcP.isArray()){
                    // create empty array in target
                    versioned[propertyName] = [];

                    // copy from source
                    for(let i =0; i < normalized[propertyName].length; i++){
                        // create indexed field desc
                        const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
                        indexedFieldDesc.index = i;

                        if(srcP.DataTypeKind ==  modeltypes.PropertyDataTypeKind.ComplexArray &&
                                tgtP.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray ){

                            // if source is undefined, then no need to do the rest.
                            if(normalized[propertyName][i] == undefined){
                                versioned[propertyName][i] = undefined;
                                continue;
                            }

                            // create the target object anyway
                            versioned[propertyName][i] = {};
                            this.auto_convert_normalized_versioned(
                                rootVersioned,
                                versioned[propertyName][i],
                                rootNormalized,
                                normalized[propertyName][i],
                                rootNormalizedModel,
                                srcP.getComplexDataTypeOrThrow(),
                                rootVersionedModel,
                                tgtP.getComplexDataTypeOrThrow(),
                                versionName,
                                indexedFieldDesc,
                                errors);
                            continue;
                    }
                    // scallar array
                    if(srcP.DataTypeKind ==  modeltypes.PropertyDataTypeKind.ScalarArray &&
                       tgtP.DataTypeKind == modeltypes.PropertyDataTypeKind.ScalarArray &&
                       srcP.DataTypeName == tgtP.DataTypeName){
                        versioned[propertyName][i] = normalized[propertyName][i];
                        continue;
                    }
                }
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
            normalizedApiTypeModel,
            normalizedApiTypeModel,
            versionedTypeModel,
            versionedTypeModel,
            versionName,
            parent_field,
            errors);
        // constraints
        this.run_convertion_constraints_normalized_versioned(
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

    // walks an api Type model and checks if all keyd are versioned
    private buildMissingKeys(versioned: any, versionedApiTypeModel: modeltypes.ApiTypeModel, parent_field: adltypes.fieldDesc, missingKeys: Map<string, adltypes.fieldDesc>): void{
        for(let p of versionedApiTypeModel.Properties){
            const currentFieldDesc =  new adltypes.fieldDesc(p.Name, parent_field);

            if(!p.isRemoved && !p.isOptional && !versioned.hasOwnProperty(p.Name)){
                missingKeys.set(currentFieldDesc.path, currentFieldDesc);
                continue;
            }

            if(adltypes.isScalar(versioned[p.Name])){
                if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                    this.opts.logger.verbose(`BuildMissingKeys can't find expected complex type[${p.Name}], instead a scalar was found, marking all keys as missing`);
                    const model = p.getComplexDataTypeOrThrow()
                    for(const pp of model.Properties){
                        if(!pp.isRemoved && !pp.isOptional){
                            const propField = new adltypes.fieldDesc(pp.Name, currentFieldDesc);
                            missingKeys.set(propField.path, propField);
                        }
                    }
                }
                continue;
            }
            // check if they are both object types. note: if not, validation will deal with it.
            if(adltypes.isComplex(versioned[p.Name])){
                if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                    // run for nested object
                    this.buildMissingKeys(versioned[p.Name], p.getComplexDataTypeOrThrow(), currentFieldDesc, missingKeys);
                    continue;
                }
                if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap){
                    // walk every key in map
                   for (const key of Object.keys(versioned[p.Name])){
                       const walkField = new adltypes.fieldDesc(key, currentFieldDesc)
                        if(adltypes.isComplex(versioned[p.Name][key])){
                            this.opts.logger.verbose(`BuildMissingKeys found expected complex map[${p.Name}] will follow the input complex object`);
                            this.buildMissingKeys(versioned[p.Name][key], p.getComplexDataTypeOrThrow(), walkField, missingKeys);
                        }else{
                            this.opts.logger.verbose(`BuildMissingKeys found expected scalar map[${p}] marking all keys as missing`);
                            const model = p.getComplexDataTypeOrThrow()
                            for(const pp of model.Properties){
                                if(!pp.isRemoved && !pp.isOptional){
                                    const propField = new adltypes.fieldDesc(pp.Name, walkField);
                                    missingKeys.set(propField.path, propField);
                                }
                            }
                        }
                   }
                  continue;
                }
            }

            // for each -possible - object in array, only valid if model is a complex array
            if(adltypes.isArray(versioned[p.Name]) && p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                // for each -possible - object in array
                for(let i =0; i < versioned[p.Name].length; i++){
                        const currentInput = versioned[p.Name][i];
                        if(adltypes.isComplex(currentInput)){
                            const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
                            indexedFieldDesc.index = i;
                            this.buildMissingKeys(currentInput, p.getComplexDataTypeOrThrow(), indexedFieldDesc, missingKeys);
                            continue;
                        }
                }
            }
        }
    }

    // walks the versioned and finds if it has extra keys
    private buildExtraKeys(versioned: any, versionedApiTypeModel: modeltypes.ApiTypeModel, parent_field: adltypes.fieldDesc, extraKeys: Map<string, adltypes.fieldDesc>): void{
        for (const propertyName of Object.keys(versioned)) {
            const currentFieldDesc =  new adltypes.fieldDesc(propertyName, parent_field);
            const p: modeltypes.ApiTypePropertyModel | undefined = versionedApiTypeModel.getProperty(propertyName);
            // is this an extra property?
            if(p == undefined){
                this.opts.logger.verbose(`BuildExtraKeys found unexpected property [${propertyName}], marking it as extra `);
                extraKeys.set(currentFieldDesc.path, currentFieldDesc);
                continue;
            }

            if(p.isMap()){
                // for each key
                for(const key of Object.keys(versioned[propertyName])){
                    const currentVal = versioned[propertyName][key];
                    const walkField = new adltypes.fieldDesc(key, currentFieldDesc);
                    if(adltypes.isComplex(currentVal)){
                        if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap){
                            // walk the object
                            this.opts.logger.verbose(`BuildExtraKeys found expected complex map[${propertyName}] will follow the input complex object`);
                            this.buildExtraKeys(currentVal, p.getComplexDataTypeOrThrow(), walkField, extraKeys);
                        }else{
                            // all keys here are considered extra
                            this.opts.logger.verbose(`BuildExtraKeys found scalar map[${propertyName}] but input is map of complex objects. will mark all keys as extra`);
                            for(const k of Object.keys(currentVal)){
                                const valField = new adltypes.fieldDesc(k, walkField);
                                extraKeys.set(valField.path, valField);
                            }
                        }
                    }
                }
                continue;
            }

            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar){
                if(adltypes.isComplex(versioned[propertyName])){
                    this.opts.logger.verbose(`BuildExtraKeys keys found complex type in[${propertyName}] expected scalar. will mark all keys as extra`)
                    for(const key of Object.keys(versioned[propertyName])){
                        const walkField = new adltypes.fieldDesc(key, currentFieldDesc);
                        extraKeys.set(walkField.path, walkField);
                    }
                }
                continue;
            }

            if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
                if(adltypes.isComplex(versioned[propertyName])){
                    // run for nested object
                    this.buildExtraKeys(versioned[propertyName], p.getComplexDataTypeOrThrow(), currentFieldDesc, extraKeys);
                }
                continue;
            }

            // run an array
            if(p.isArray() && adltypes.isArray(versioned[propertyName])){
                for(let i =0; i < versioned[propertyName].length; i++){
                    const currentInput = versioned[propertyName][i];
                    const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
                    indexedFieldDesc.index = i;

                    // run the rabbit hole if we are sourcing from a complex object
                    // otherwise it just becomes an invalid (caught in validation).
                    if(adltypes.isComplex(currentInput)){
                        if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
                            this.buildExtraKeys(currentInput, p.getComplexDataTypeOrThrow(), indexedFieldDesc, extraKeys);
                        }else{
                            this.opts.logger.verbose(`BuildExtraKeys keys found complex type in[${propertyName}${i}] expected scalar. will mark all keys as extra`)
                            for(const key of Object.keys(currentInput)){
                                 const walkField = new adltypes.fieldDesc(key, indexedFieldDesc);
                                extraKeys.set(walkField.path, walkField);
                            }
                        }
                    }

                }
                continue;
            }

            // what about p.Array == false && p.isArray() && adltypes.isArray(versioned[propertyName]) == true?
            // as we copy the data, we validate correctness of data type.
        }
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
                const ctx = machinerytypes.createConstraintExecCtx(this.machinery, this.opts, c.Name, c.Arguments, p.Name, currentFieldDesc,errors);
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
                const ctx = machinerytypes.createConstraintExecCtx(this.machinery, this.opts, c.Name, c.Arguments, p.Name, currentFieldDesc,errors);
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
                        const ctx = machinerytypes.createConstraintExecCtx(this.machinery, this.opts, c.Name, c.Arguments, key, walkField, errors);
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
                        const ctx = machinerytypes.createConstraintExecCtx(this.machinery, this.opts, c.Name, c.Arguments, key, walkField, errors);
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
                        if(leveled[p.Name][i] != undefined && p.DataTypeName != (typeof leveled[p.Name][i])){
                            errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected ${p.DataTypeName}`, currentFieldDesc));
                            continue;
                        }

                        // run array elements constraint
                        const elementValidationConstraints =  p.getArrayElementValidationConstraints();
                        for(let c of validationConstraints){
                            const implementation = this.machinery.getValidationConstraintImplementation(c.Name);
                            const ctx = machinerytypes.createConstraintExecCtx(this.machinery, this.opts, c.Name, c.Arguments, p.Name, indexedFieldDesc,errors);
                                implementation.Run(
                                    ctx,
                                    root,
                                    leveled[p.Name][i],
                                    existingRoot,
                                    (existingLeveled && existingLeveled[p.Name].length > i ) ? existingLeveled[p.Name][i]: undefined,
                                    rootApiTypeModel,
                                    p.getComplexDataTypeOrThrow(),
                                    false);
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
        const versionedTyped =  adltypes.isComplex(payload) ? payload : JSON.parse(payload);
        const rootField = adltypes.getRootFieldDesc();

        /* TODO: @khenidak optimize
         * we currently walk the object graph too many time
         * walk for missing keys
         * walk for extra keys
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

        // missing keys
        const missingKeys = new Map<string, adltypes.fieldDesc>();
        this.buildMissingKeys(versionedTyped, versionedTypeModel, rootField, missingKeys);
        // for each missing key add an error
        for(let [k,v] of missingKeys) errors.push(adltypes.createKnownError_MissingProperty(v));


        const extraKeys = new Map<string, adltypes.fieldDesc>();
        this.buildExtraKeys(versionedTyped, versionedTypeModel,rootField, extraKeys);
        for(let [k,v] of extraKeys) errors.push(adltypes.createKnownError_ExtraProperty(v));

        // there is no point of running validation or defaulting
        // on something that is not complete
        if(extraKeys.size > 0 || missingKeys.size > 0)
            return {} as adltypes.Normalized;

        // with the rest of valiation
        const normalized = {} as adltypes.Normalized;

        this.convert_versioned_normalized(versionedTyped, normalized, apiModel, versionModel.Name, versionedTypeModel, normalizedTypeModel, rootField, errors);
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
        const normalizedTyped = adltypes.isComplex(normalizedPayload) ? normalizedPayload : JSON.parse(normalizedPayload);

        const rootField = adltypes.getRootFieldDesc();

        const versionedTyped =  {} as adltypes.Versioned;
        this.convert_normalized_versioned(normalizedTyped, versionedTyped, apiModel, tgtVersionName, normalizedTypeModel, versionedTypeModel, rootField, errors);
        this.default_versioned(versionedTyped, apiName, tgtVersionName, tgtVersionedApiTypeName, errors);

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
