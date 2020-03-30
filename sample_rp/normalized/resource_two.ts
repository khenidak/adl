/* this is a sample resource that uses custom validator and defaulter.
 * notice we mix declarative and imperative logic (yes this is allowed)
 */

import * as adltypes from '@azure-tools/adl.types'

// I need a custom validator and a defaulter for my fancy resource
// notice here we are using classes, in vm we used interfaces
// both are ok
export class ResourceTwoProps{
    prop1: number &
                 adltypes.Maximum<200> &
                 adltypes.Immutable;

    prop2: string &
                 adltypes.MustMatch<'^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$'>;
}


export class ResourceTwoPropsNormalizer extends adltypes.AutoNormalizer<ResourceTwoProps>{
    // *** THE BELOW IS AN EXAMPLE OF CUSTOM VALIDATOR AND DEFAULTER. THIS IS NOT THE NORMAL
    // *** APIS DESIGNER WILL NEED TO DO THAT ONLY IF THEY NEED CUSTOM BEHAVIOR. IN OTHER
    // *** WORDS IF THE ANNOTATIONS (INTERSECTIONS) ARE NOT PROVIDING THE BEHAVIOR NEEDED.
    Default(obj: ResourceTwoProps, errors: adltypes.errorList) {
        if(obj.prop1 == 0)
                obj.prop1 = 9999;
    }

    Validate (old: ResourceTwoProps | undefined, newObject: ResourceTwoProps,  errors: adltypes.errorList) {
        // if we are in update mode we are only intersted in new
        // if not then just do the old


        // though we can express the below with annotation, we need
        // to allow apis designer to express validation as required
        if(newObject.prop1 == 123 && newObject.prop2 === "ValueWeDontLike"){

            // note any error returned from Validate is always
            // validated by calling Validate() on error object itself.
            // this ensures that even custom errors are consistent.
            var err =  new adltypes.error();
            err.errorType    = "fancy error type";
            err.errorMessage = "fancy error message";

            errors.push(err);
        }
    }
}
