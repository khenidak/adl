/* this is a sample resource that uses custom validator and defaulter.
 * notice we mix declarative and imperative logic (yes this is allowed)
 */

import * as adltypes from '@azure-tools/adl.types'
import * as armtypes from '@azure-tools/arm.adl'
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

// because we work with wrapped resouce our normalizer needs to work with wrapped resources as well
export class RespourceTwoNormalizer implements adltypes.Normalizer<armtypes.ArmNormalizedResource<ResourceTwoProps>>{
    // *** THE BELOW IS AN EXAMPLE OF CUSTOM VALIDATOR AND DEFAULTER. THIS IS NOT THE NORMAL
    // *** APIS DESIGNER WILL NEED TO DO THAT ONLY IF THEY NEED CUSTOM BEHAVIOR. IN OTHER
    // *** WORDS IF THE ANNOTATIONS (INTERSECTIONS) ARE NOT PROVIDING THE BEHAVIOR NEEDED.
    Default(obj: armtypes.ArmNormalizedResource<ResourceTwoProps>, errors: adltypes.errorList) {
        // call arm normalizer on the envelop
        const armNormalizer = new armtypes.ArmNormalizer<ResourceTwoProps>();
        armNormalizer.Default(obj, errors);
        if(errors.length > 0) return;

        if(obj.properties.prop1 == 0)
                obj.properties.prop1 = 200;
    }

    Validate (old: armtypes.ArmNormalizedResource<ResourceTwoProps> | undefined, newObject: armtypes.ArmNormalizedResource<ResourceTwoProps>,  errors: adltypes.errorList) {
        // call arm normalizer on the envelop
        const armNormalizer = new armtypes.ArmNormalizer<ResourceTwoProps>();
        armNormalizer.Validate(old, newObject, errors);
        if(errors.length > 0) return;


        // if we are in update mode we are only intersted in new
        // if not then just do the old


        // though we can express the below with annotation, we need
        // to allow apis designer to express validation as required
        if(newObject.properties.prop1 == 123 && newObject.properties.prop2 === "ValueWeDontLike"){

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
//wrap the properties in envelop
export type ResourceTwoNormalized  = armtypes.ArmNormalizedResource<ResourceTwoProps>;
