import * as adltypes from "@azure-tools/adl.types";
import * as apisnormalized from '../normalized/module'

import * as e from './error'
// versioned view of errorList
export interface errorList {
}

//!!! DON NOT USE UNTIL ADL SUPPORTS ROOT ARRAY TYPES !!!
export class errorListVersioner implements adltypes.Versioner<apisnormalized._errorList, errorList>{
    Normalize(versioned: errorList, normalized: apisnormalized._errorList, errors: adltypes.errorList) : void{
        throw new Error("normalizing an errorList is not supported");// Reason being, errors are not saved or processed like a regular api type
    }
    // creates a versioned view of the error
    Convert(normalized: apisnormalized._errorList, versioned: errorList, errors: adltypes.errorList): void{
        versioned = new Array<e.error>();
        const errorVersioner = new e.errorVersioner();
        for(const normalized_e of (normalized as adltypes.errorList)){
            const versioned_e = {} as e.error;
            errorVersioner.Convert(normalized_e, versioned_e, errors);
            (versioned as Array<e.error>).push(versioned_e);
        }
     }
}
