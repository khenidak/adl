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

// because we work with arm wrapped resources, our versioner need to work with them as well
export class ResourceTwo20200909Versioner implements adltypes.Versioner<armtypes.ArmNormalizedResource<normalized.ResourceTwoProps>, armtypes.ArmVersionedResource<ResourceTwo>>{

    Normalize(versioned: armtypes.ArmVersionedResource<ResourceTwo>, normalized: armtypes.ArmNormalizedResource<normalized.ResourceTwoProps>, errors: adltypes.errorList) :void{
        // call arm versioner, since we expect it to also work on its envelop
        const armVersioner = new armtypes.ArmVersioner<normalized.ResourceTwoProps, ResourceTwo>();
        armVersioner.Normalize(versioned, normalized, errors);
        if(errors.length >0) return;


        normalized.properties.prop1 = versioned.properties.prop1;
        normalized.properties.prop2 = versioned.properties.prop2 + `custom value added by impertive versioner`;
    }

    Convert(normalized: armtypes.ArmNormalizedResource<normalized.ResourceTwoProps>, versioned: armtypes.ArmVersionedResource<ResourceTwo>, errors: adltypes.errorList):void{
        // call arm versioner since we expect it to also work with its envelop
        const armVersioner = new armtypes.ArmVersioner<normalized.ResourceTwoProps, ResourceTwo>();
        armVersioner.Convert(normalized, versioned, errors);
        if(errors.length >0) return;

        versioned.properties.prop1 = normalized.properties.prop1;
        versioned.properties.prop2 = normalized.properties.prop2;
    }
}

// for this resource we want to envelop it in ARM. so we are doing this:
export type ResourceTwo20200909 = armtypes.ArmVersionedResource<ResourceTwo>;
