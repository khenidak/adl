import * as adltypes from '@azure-tools/adl.types'
import * as modeltypes from '../model/module'

export const ADL_RUNTIME_NAME = "adlruntime";

// --- CONFORMANCE TYPES ---- //
/* conformance engine types */
// types are made in a way to allow
// easy create a narrow scoped rule
// easy create a wide scoped rule
export const DEFAULT_CONFORMANCE_GROUP:string = "default";
export enum ConformanceRuleScope{
    Api                             = 1 << 1,
    NormalizedApiType = 1 << 2,
    ApiVersion              = 1 << 3,
    VersionedApiType    = 1 << 4,
    ApiType                     = NormalizedApiType | VersionedApiType,
    ApiTypeProperty     = 1 << 5,
}

export enum ConformanceKind{
    Shape       = 1 << 1,
    Semantic = 1 << 2,
    All                     = Shape & Semantic,
}

export enum ConformanceViolationKind{
    Warning,
    Unconformant,
}

// ConformanceError represents the outcome of running a conformance rule
export class ConformanceError{
    // values set by conformance runtime (even if they are set by the rule)
    RuleName: string;
    Group: string;
    OwnerRuntime: string;

    // values wiull be set by conformance runtime if they are not set by the rule
    // where possible
    ViolationKind: ConformanceViolationKind = ConformanceViolationKind.Unconformant;
    Scope: ConformanceRuleScope | undefined;
    Kind: ConformanceKind | undefined;
    Message: string;
    ModelName: string | undefined;
    VersionName: string| undefined;
    NormalizedTypeName: string |  undefined;
 VersionedTypeName: string| undefined;
    TypePropertyName: string | undefined;
}


// Wide scope rule implementation
export interface ConformanceRule<T extends modeltypes.AnyAdlModel>{
    readonly Name: string;
    /*TODO description*/
    readonly Scope: ConformanceRuleScope;
    readonly Kind: ConformanceKind;
    readonly Group: string;
    RunRule(instance: T): Array<ConformanceError>;
}

// narrow scope base implementation is in conformance directory
// Constraints Types
export interface ConstraintExecContext{
        // allows for chaining constraints
        machinery: Machinery;
        // logging, log level etc
        opts: modeltypes.apiProcessingOptions;
        // name of the constraint
        ConstraintName:string;
        // arguments of this constraint
        ConstraintArgs: Array<any>;
        // property name where the constraint should run
        propertyName: string;
        // current field
        fieldPath: adltypes.fieldDesc;
        // error bag
        errors: adltypes.errorList;
}

export function createConstraintExecCtx(
        machinery: Machinery,
        opts: modeltypes.apiProcessingOptions,
        ConstraintName:string,
        ConstraintArgs: Array<any>,
        propertyName: string,
        fieldPath: adltypes.fieldDesc,
        errors: adltypes.errorList
    ): ConstraintExecContext {
        return {
            machinery: machinery,
            opts: opts,
            ConstraintName:ConstraintName,
            ConstraintArgs: ConstraintArgs,
            propertyName: propertyName,
            fieldPath: fieldPath,
            errors: errors,
        } as ConstraintExecContext;
}

// --- DEFAULTING CONSTRAINT  TYPES ---- //
// DefaultingConstraintImpl is the implementation of a defaulting constraint
export interface DefaultingConstraintImpl{
    Run(
        context: ConstraintExecContext,
        // the root of the api type (example if the api is Person, then Person instance is the root).
        rootTyped: any,
        // the actual api type (Example: if we are working on Person.Address.Street[string]) then this will have Address
        typedLeveled: any,
        // model for the root api type
        rootApiTypeModel: modeltypes.ApiTypeModel,
        // model for the leveled api type
        leveledApiTypeModel: modeltypes.ApiTypeModel) : void;
}

// --- VALIDATION CONSTRAINT  TYPES ---- //
// ValidationConstraintImpl is the implementation of a defaulting constraint
export interface ValidationConstraintImpl{
    Run(
        context: ConstraintExecContext,
        // the root of the api type (example if the api is Person, then Person instance is the root).
        rootTyped: any,
        // the actual api type (Example: if we are working on Person.Address.Street[string]) then this will have Address
        typedLeveled: any,
        // root of existing data
        existingRootTyped: any,
        // leveled of existing data
        existingTypedLeveled:any,
        // model for the root api type
        rootApiTypeModel: modeltypes.ApiTypeModel,
        // model for the leveled api type
        leveledApiTypeModel: modeltypes.ApiTypeModel) :boolean; // valid or not
}

// --- CONVERSION CONSTRAINT TYPES ---- ////
// auto converter call back

export interface ConversionConstraintImpl{
    // called on the constraint when the conversion
    // is normalized => versioned
    ConvertToNormalized(
        context: ConstraintExecContext,
        //runtime (to walk through nested object graph if needed
        r: ApiRuntime,
        // root of versioned object
         rootVersioned: any,
        // leveled current versioned object
        leveledVersioned: any,
        // root of normalized
        rootNormalized: any,
        // leveled of normalized object
        leveledNormalized: any | undefined,
        // models
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel | undefined,
        versionName: string):void;

    // called on the constraint when the conversion
    // is normalized => versioned
    ConvertToVersioned(
        context: ConstraintExecContext,
        //runtime (to walk through nested object graph if needed
        r: ApiRuntime,
        // root of versioned object
         rootVersioned: any,
        // leveled current versioned object
        leveledVersioned: any,
        // root of normalized
        rootNormalized: any,
        // leveled of normalized object
        leveledNormalized: any | undefined,
        // models
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel | undefined,
        versionName: string):void;

}

export function createValidationError(message: string, fieldPath: adltypes.fieldDesc): adltypes.error{
    const e = new adltypes.error;
    e.errorType         = "validation";
    e.errorMessage = message;
    e.field = fieldPath;
    return e;
}

export interface Machinery{
    getDefaultingConstraintImplementation(name: string): DefaultingConstraintImpl;
    getValidationConstraintImplementation(name: string): ValidationConstraintImpl;
    getConversionConstraintImplementation(name:string): ConversionConstraintImpl;
}

export interface ApiRuntime{
    // runs defaults for a normalized type
    default_normalized(payload: string | any,
                                                                                apiName: string,
                                                                                normalizedApiTypeName: string,
                                                                                errors: adltypes.errorList): void;

    // runs defaults on a versioned type (declartive only)
    default_versioned(payload: string | any,
                                                                            apiName: string,
                                                                            versionName: string,
                                                                            versionedApiTypeName: string,
                                                                            errors: adltypes.errorList): void;

    // converts a versioned payload to normalized one
    // runs constraints (validation, defaulting and conversion).
    normalize(payload: string | any,
                                            apiName: string,
                                            versionName: string,
                                            versionedApiTypeName: string,
                                            errors: adltypes.errorList): adltypes.Normalized;

    // converts normalized type to versioned
    // runs constraints (defaulting and versioning).
    denormalize(normalizedPayload: string | any,
                                                    apiName: string,
                                                    tgtVersionName: string,
                                                    tgtVersionedApiTypeName: string,
                                                    errors: adltypes.errorList): adltypes.Versioned;

    // converts a versioned type to another.
    // runs all constraints
    convert(payload: string | any,
                                    apiName: string,
                                    srcVersionName: string,
                                    srcVersionedApiTypeName: string,
                                    tgtVersionName: string,
                                    tgtVersionedApiTypeName: string,
                                    errors: adltypes.errorList): adltypes.Versioned;

    create_normalized_instance(apiName: string, normalizedApiTypeName: string /* TODO: complete:bool i.e. fuzzed */ ): adltypes.Normalized;
    create_versioned_instance(apiName: string, versionName: string, versionedApiTypeName: string, /* TODO: complete:bool i.e. fuzzed */): adltypes.Versioned;

    // only runs the auto converter logic
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
        errors:  adltypes.errorList): void;

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
        errors:  adltypes.errorList): void;
}
