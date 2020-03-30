import * as adltypes from '@azure-tools/adl.types'
import * as armtypes from '@azure-tools/arm.adl'
import * as normalized from '../normalized/module'



/*
 * THIS IS AN EXAMPLE OF A VERSIONED API THAT GOES ALL IMPERATIVE
 * WHILE WE FULLY SUPPORT THIS. WE SHOULD TRY AND PUSH PEOPLE
 * TO USE ANNOTATION INSTEAD
 */


class ResourceTwo{
    prop1: number;
    prop2: string;
}

class ResourceTwoVersioner implements adltypes.Versioner<normalized.ResourceTwoProps, ResourceTwo>{

    Normalize(versioned: ResourceTwo, normalized: normalized.ResourceTwoProps, errors: adltypes.errorList) :void{
        normalized.prop1 = versioned.prop1;
        normalized.prop2 = versioned.prop2 + `custom value added by versioner`;
    }

    Convert(normalized: normalized.ResourceTwoProps, versioned:ResourceTwo, errors: adltypes.errorList):void{
        versioned.prop1 = normalized.prop1;
        versioned.prop2 = normalized.prop2;
    }
}

// for this resource we want to envelop it in ARM. so we are doing this:
export type ResourceTwo20200909 = armtypes.ArmVersionedResource<ResourceTwo>;
//again wrap the versioner
export type ResourceTwo20200909Versioner = armtypes.ArmVersioner<normalized.ResourceTwoProps, ResourceTwo, ResourceTwoVersioner>
