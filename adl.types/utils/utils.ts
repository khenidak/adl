import * as adltypes from '../core/module'

//https://stackoverflow.com/questions/8834126/how-to-efficiently-check-if-variable-is-array-or-object-in-nodejs-v8
// NOTE: Array is not an object *sigh*

// returns true if a is an array []
export function isArray(a: any | undefined): boolean {
    if(a == undefined) return false;
    return (!!a) && (a.constructor === Array);
};

// returns true if a is complex {} object
export function isComplex(a: any | undefined): boolean{
    if(a == undefined) return false;
    return (!!a) && (a.constructor === Object);
}

export function isScalar(a: any | undefined): boolean{
    if(a == undefined) return false;
    return !isArray(a) && !isComplex(a);
}

export function  getRootFieldDesc(): adltypes.fieldDesc{
        return new adltypes.fieldDesc("$");
}


// KNOWN ERRORS
export function createKnownError_MissingProperty(fieldDesc: adltypes.fieldDesc): adltypes.error{
    const e =  new adltypes.error();
    e.errorMessage = `an non-optional ${fieldDesc.name} property is missing [${fieldDesc.path}]`;
    e.errorType = "validation";
    e.field = fieldDesc;
    return e;
}

export function createKnownError_ExtraProperty(fieldDesc: adltypes.fieldDesc): adltypes.error{
    const e =  new adltypes.error();
    e.errorMessage = `unknown property ${fieldDesc.name} [${fieldDesc.path}]`;
    e.errorType = "validation";
    e.field = fieldDesc;
    return e;
}

