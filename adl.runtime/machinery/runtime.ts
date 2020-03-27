import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from './machinery.types'

// TODO: !!!+++ NULL CHECKS IS MISSING +++ !!! //

/* What is walking the object graph mean (used below frequently):
	* given a payload that looks like
	* {		..key value properties..
	*		complexObject: {
	*				..key value properties..
	*			}
	*		arrayOfComplex: [
	*				{
	*					..key value properties..
	*				}
	*		]
	*		arrayOfSimple: [ "", "", ""]
	*		}
	*	Walking means going from root object to every single property, including those
	*	which might be part of an complex object inside an array.
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
	constructor(private store: modeltypes.ApiManager, private machinery: machinerytypes.Machinery, private opts: modeltypes.apiProcessingOptions){}


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


			if(adltypes.isComplex(leveledVersioned[propertyName]) && versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
				this.run_convertion_constraints_versioned_normalized(
					rootVersioned,
					leveledVersioned[propertyName],
					rootNormalized,
					leveledNormalized ? leveledNormalized[propertyName] : undefined,
					rootVersionedModel,
					versionedP.ComplexDataType,
					rootNormalizedModel,
					leveledNormalizedModel ? leveledNormalizedModel.getProperty(propertyName)?.ComplexDataType : undefined,
					versionName,
					currentFieldDesc,
					errors);
			}
			// we don't run through arrays in ConversionConstraints
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
			continue;
		}

		const normalizedP = leveledNormalizedModel.getProperty(propertyName);
			if(normalizedP == undefined)
					continue; // this property does not exist in normalized


			// match data types
			if(adltypes.isScalar(leveledVersioned[propertyName]) && normalizedP.DataTypeKind != modeltypes.PropertyDataTypeKind.Scalar) continue;
			if(adltypes.isComplex(leveledVersioned[propertyName]) && normalizedP.DataTypeKind != modeltypes.PropertyDataTypeKind.Complex) continue;
			if(adltypes.isArray(leveledVersioned[propertyName]) && !normalizedP.isArray()) continue;


			//copy as as scalar
			if(adltypes.isScalar(leveledVersioned[propertyName])){
				leveledNormalized[propertyName] = leveledVersioned[propertyName];
				continue;
		}

			// run it as an object
			if(adltypes.isComplex(leveledVersioned[propertyName])){
					leveledNormalized[propertyName] = {}; // define empty object

				this.auto_convert_versioned_normalized(
					rootVersioned,
					leveledVersioned[propertyName],
					rootNormalized,
					leveledNormalized[propertyName],
					rootVersionedModel,
					versionedP.ComplexDataType,
					rootNormalizedModel,
					normalizedP.ComplexDataType,
					versionName,
					currentFieldDesc,
					errors);

				continue;
			}

			// if src and target are arrays
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
								versionedP.ComplexDataType,
								rootNormalizedModel,
								normalizedP.ComplexDataType,
								versionName,
								indexedFieldDesc,
								errors);
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

		this.opts.logger.verbose(`custom versioner:${versionedTypeModel.VersionerName} is normalizing ${apiModel.Name}/${versionName}/${versionedTypeModel.Name} => ${normalizedApiTypeModel.Name}`);
		const imperative_versioner = apiModel.createSpecInstance(versionedTypeModel.VersionerName) as adltypes.Versioner<adltypes.Normalized, adltypes.Versioned>;

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


			if(adltypes.isComplex(leveledVersioned[versionedP.Name]) && versionedP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
				this.run_convertion_constraints_normalized_versioned(
					rootVersioned,
					leveledVersioned[versionedP.Name],
					rootNormalized,
					leveledNormalized ? leveledNormalized[versionedP.Name] : undefined,
					rootVersionedModel,
					versionedP.ComplexDataType,
					rootNormalizedModel,
					leveledNormalizedModel ? leveledNormalizedModel.getProperty(versionedP.Name)?.ComplexDataType : undefined,
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

			const log_prefix = `auto de-normalizing ${normalizedApiTypeModel} => ${versionName}/${versionedTypeModel.Name}`
			// walk the keys of normalized (source)
			for(let propertyName of Object.keys(normalized)){
				const currentFieldDesc =  new adltypes.fieldDesc(propertyName, parent_field);

				// !!IMPORTANT !!! we are walking all the keys in source, assuming that
				// source is clean, e.g no extra fields, no garbage.

				const tgtP = versionedTypeModel.getProperty(propertyName); // name has changed, property remaped, removed etc.
				if(!tgtP)	continue;

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


				// now we know that both are of same data type kind and name.. copy
				if(srcP.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar){
					if(srcP.DataTypeName == tgtP.DataTypeName){
						versioned[propertyName] = normalized[propertyName];
						continue;
					}
				}

				// the rest of conversions requires source to be not undefined
				if(normalized[propertyName] == undefined)
					continue;

				// run it as an object
				if(srcP.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
					versioned[propertyName] = {}; // define empty object
					this.auto_convert_normalized_versioned(
						rootVersioned,
						versioned[propertyName],
						rootNormalized,
						normalized[propertyName],
						rootNormalizedModel,
						srcP.ComplexDataType,
						rootVersionedModel,
						tgtP.ComplexDataType,
						versionName,
						currentFieldDesc,
						errors);
					continue;
				}

				// if src and target are arrays
				if(srcP.isArray() && tgtP.isArray()){
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
								srcP.ComplexDataType,
								rootVersionedModel,
								tgtP.ComplexDataType,
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

		//TODO add version name to versioned for logging purposes
		this.opts.logger.verbose(`custom versioner:${versionedTypeModel.VersionerName} is versioning ${normalizedApiTypeModel.Name} => ${apiModel.Name}/${versionName}/${versionedTypeModel.Name}`);

		const imperative_versioner = apiModel.createSpecInstance(versionedTypeModel.VersionerName) as adltypes.Versioner<adltypes.Normalized, adltypes.Versioned>;
		// run it == TODO: metric collection here
		imperative_versioner.Convert(normalized as adltypes.Versioned, versioned as adltypes.Versioned, errors);

	}

	// walks an api Type model and checks if all keyd are versioned
	private buildMissingKeys(versioned: any, versionedApiTypeModel: modeltypes.ApiTypeModel, parent_field: adltypes.fieldDesc, missingKeys: Map<string, adltypes.fieldDesc>): void{
		for(let p of versionedApiTypeModel.Properties){
			const currentFieldDesc =  new adltypes.fieldDesc(p.Name, parent_field);
			// This will need to be revisisted if we allow aliasing
			if(!p.isRemoved && !p.isOptional && !versioned.hasOwnProperty(p.Name)){
				missingKeys.set(currentFieldDesc.path, currentFieldDesc);
				continue;
			}

			// check if they are both object types. note: if not, validation will deal with it.
			if(adltypes.isComplex(versioned[p.Name]) && p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
				// run for nested object
				this.buildMissingKeys(versioned[p.Name], p.ComplexDataType, currentFieldDesc, missingKeys);
				continue;
			}

			// for each -possible - object in array, only valid if model is a complex array
			if(adltypes.isArray(versioned[p.Name]) && p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray){
				// for each -possible - object in array
				for(let i =0; i < versioned[p.Name].length; i++){
						const currentInput = versioned[p.Name][i];
						if(adltypes.isComplex(currentInput)){
							const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
							indexedFieldDesc.index = i;
							this.buildMissingKeys(currentInput, p.ComplexDataType, indexedFieldDesc, missingKeys);
							continue;
						}
				}
			}
		}
	}

	// walks the versioned and finds if it has extra keys
	private buildExtraKeys(versioned: any, versionedApiTypeModel: modeltypes.ApiTypeModel, parent_field: adltypes.fieldDesc, extraKeys: Map<string, adltypes.fieldDesc>): void{
		for (let propertyName of Object.keys(versioned)) {
			const currentFieldDesc =  new adltypes.fieldDesc(propertyName, parent_field);
			const p: modeltypes.ApiTypePropertyModel | undefined = versionedApiTypeModel.getProperty(propertyName);
			// is this an extra property?
			if(p == undefined){
				extraKeys.set(currentFieldDesc.path, currentFieldDesc);
				continue;
			}

			// run a complex object
			if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex  && adltypes.isComplex(versioned[propertyName])){
				// run for nested object
				this.buildExtraKeys(versioned[propertyName], p.ComplexDataType, currentFieldDesc, extraKeys);
				continue;
			}

			// run an array
			if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray && adltypes.isArray(versioned[propertyName])){
				for(let i =0; i < versioned[propertyName].length; i++){
					const currentInput = versioned[propertyName][i];
					const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
					indexedFieldDesc.index = i;

					// run the rabbit hole if we are sourcing from a complex object
					// otherwise it just becomes an invalid (caught in validation).
					if(adltypes.isComplex(currentInput))
						this.buildExtraKeys(currentInput, p.ComplexDataType, indexedFieldDesc, extraKeys);

					continue;
				}
			}
		}
	}

	// note we run defaults in ts separate walk to allow cross references.
	// e.g. property default may depend on the value of another property which may yet to be set.
	// running in a saprate walk has a cost but allows more flixibility and less error prone
	// note 2: we keep track of root object to allow defaulting constraint to cross ref
	// other properties as needed
	private run_type_defaults(
										root:	any,
										leveled: any,
										rootApiTypeModel: modeltypes.ApiTypeModel,
										leveledApiTypeModel: modeltypes.ApiTypeModel,
										parent_field: adltypes.fieldDesc,
										errors: adltypes.errorList): void{

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

			// complex + not undefined (we check because defaulting
			// may have choosen not to default it.
			if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex && leveled[p.Name] != undefined){
				this.run_type_defaults(root, leveled[p.Name], rootApiTypeModel, p.ComplexDataType, currentFieldDesc, errors);
				continue;
			}

			// for each entry in the array.. default it
			if(p.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray && leveled[p.Name] != undefined){
				for(let i =0; i < leveled[p.Name].length; i++){
					const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
					indexedFieldDesc.index = i;
					this.run_type_defaults(root, leveled[p.Name][i], rootApiTypeModel, p.ComplexDataType, indexedFieldDesc, errors);
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

		this.opts.logger.verbose(`custom normalizer:${normalizedApiTypeModel.NormalizerName} is defaulting ${apiModel.Name}/${normalizedApiTypeModel.Name}`);

		const imperative_normalizer = apiModel.createSpecInstance(normalizedApiTypeModel.NormalizerName) as adltypes.Normalizer<adltypes.Normalized>;
		// run it == TODO: metric collection here
		imperative_normalizer.Default(normalizedTyped, errors);
	}


	// walks the object graph finds validation constraints and run them
	private validate(
		root:	any,
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
			const hasValue = (leveled[p.Name] != undefined)

			// TODO: !!!!!! nulls
			if(!p.isOptional && !hasValue){
				errors.push(machinerytypes.createValidationError(`field ${p.Name} is missing`, currentFieldDesc));
				continue;
			}

			// basic data type match validation
			if(hasValue && p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex  && !adltypes.isComplex(leveled[p.Name])){
				errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected complex object`, currentFieldDesc));
				continue;
			}

			if(hasValue && p.isArray() && !adltypes.isArray(leveled[p.Name])){
				errors.push(machinerytypes.createValidationError(`field ${p.Name} is invalid. Expected array`, currentFieldDesc));
				continue;
			}

			if(hasValue && p.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar && p.DataTypeName != (typeof leveled[p.Name])){
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
					leveledApiTypeModel);
			}

			// complex data type
			if(hasValue && p.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex){
				this.validate(
					root,
					leveled[p.Name],
					existingRoot,
					(existingLeveled) ? existingLeveled[p.Name]: undefined,
					rootApiTypeModel,
					p.ComplexDataType,
					currentFieldDesc,
					errors);
				continue;
			}

			// run an array
			if(hasValue && p.isArray()){
				for(let i =0; i < leveled[p.Name].length; i++){
					const indexedFieldDesc = new adltypes.fieldDesc("", currentFieldDesc);
					indexedFieldDesc.index = i;

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
							p.ComplexDataType,
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
								p.ComplexDataType);
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

		this.opts.logger.verbose(`custom normalizer:${normalizedApiTypeModel.NormalizerName} is validating ${apiModel.Name}/${normalizedApiTypeModel.Name}`);
		const imperative_normalizer = apiModel.createSpecInstance(normalizedApiTypeModel.NormalizerName) as adltypes.Normalizer<adltypes.Normalized>;
		imperative_normalizer.Validate(undefined, normalizedTyped, errors);
	}

	validate_normalized_oncreate(payload: string | any, apiName: string, normalizedApiTypeName: string, errors: adltypes.errorList):void{
		const apiModel = this.store.getApiInfo(apiName)
		if(!apiModel) throw new InvalidErrorApiModel(apiName);

		const normalizedApiTypeModel = apiModel.getNormalizedApiType(normalizedApiTypeName);
		if(!normalizedApiTypeModel) throw new InvalidApiTypeModel(normalizedApiTypeName);

		const normalizedTyped = adltypes.isComplex(payload) ? payload : JSON.parse(payload);
		const rootField = adltypes.getRootFieldDesc();

		this.validate(normalizedTyped, normalizedTyped, undefined /* on create we won't have existing*/, undefined, normalizedApiTypeModel, normalizedApiTypeModel, rootField, errors);

		if(normalizedApiTypeModel.NormalizerName == adltypes.AUTO_NORMALIZER_NAME)
			return;

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
		//TODO !!! DECISION POINT: SHOULD WE RUN VALIDATORS HERE

		const rootField = adltypes.getRootFieldDesc();
		//TODO create list of conversion propertiesconstraints
		// that way conversion from Normalized does not have to check every field if there is a map to
		// pass it down to conversion logic

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
				this.build_instance(subModel as adltypes.Normalized, p.ComplexDataType, currentFieldDesc);
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
						this.build_instance((elementModel as adltypes.Normalized), p.ComplexDataType, indexedFieldDesc);
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
