import * as adltypes from '@azure-tools/adl.types'

// exactly like adl.errors, redefining it here allows us to avoid mixed symbols
export interface _field{
    path: string;
}
export interface _error{
    errorType :string;
    errorMessage: string;
    field?: _field;
}

// this works because our versioner knows how to deal with that array type
export interface _errorList{

}

// noop error normalizer
export class  errorNormalizer implements adltypes.Normalizer<_error> {
    Default(obj: _error, errors: adltypes.errorList) : void{
        // no op
    }

    Validate (old: _error | undefined, newObject: _error, errors: adltypes.errorList) : void{
        // no op
    }
}
export class  errorListNormalizer implements adltypes.Normalizer<_errorList> {
    Default(obj: _errorList, errors: adltypes.errorList) : void{
        // no op
    }

    Validate (old: _error | undefined, newObject: _errorList, errors: adltypes.errorList) : void{
        // no op
    }
}

/**
 * normalized view of adl error, with a no op normalized
 *
 */
export type error_normalized = adltypes.CustomNormalizedApiType<'error', _error, errorNormalizer>;
/**
 * normalized view of adl errorList, with a no op normalized
 *
 */
//!!! DON NOT USE UNTIL ADL SUPPORTS ROOT ARRAY TYPES !!!

export type errorList_normalized = adltypes.CustomNormalizedApiType<'errorlist', _errorList, errorListNormalizer>;
