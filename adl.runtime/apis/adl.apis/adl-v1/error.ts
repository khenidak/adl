import * as adltypes from "@azure-tools/adl.types";
import * as apisnormalized from '../normalized/module'

// versioned view of error
export interface error{
    errorType : string & adltypes.NoAutoConversion;
    errorMessage: string & adltypes.NoAutoConversion;
    fieldPath?: string & adltypes.NoAutoConversion;
}


export class errorVersioner implements adltypes.Versioner<apisnormalized._error, error>{
    Normalize(versioned: error, normalized: apisnormalized._error, errors: adltypes.errorList) : void{
        throw new Error("normalizing an error is not supported");// Reason being, errors are not saved or processed like a regular api type
    }
    // creates a versioned view of the error
    Convert(normalized: apisnormalized._error, versioned: error ,errors: adltypes.errorList): void{
        versioned.errorType = normalized.errorType;
        versioned.errorMessage = normalized.errorMessage;
        if(normalized.field != undefined){
            versioned.fieldPath = normalized.field.path;
        }
    }
}
