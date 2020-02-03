import * as adltypes from '@azure-tools/adl.types'
import * as normalized from '../normalized/module'



/*
 * THIS IS AN EXAMPLE OF A VERSIONED API THAT GOES ALL IMPERATIVE
 * WHILE WE FULLY SUPPORT THIS. WE SHOULD TRY AND PUSH PEOPLE
 * TO USE ANNOTATION INSTEAD
 */

export class ResourceTwo{
	prop1: adltypes.int32;
	prop2: string;
}

export class ResourceTwoVersioner_20200909 implements adltypes.Versioner<normalized.ResourceTwoProps, ResourceTwo>{

	Normalize(versioned: ResourceTwo, normalized: normalized.ResourceTwoProps, errors: adltypes.errorList) :void{
		normalized.prop1 = versioned.prop1;
		normalized.prop2 = versioned.prop2 + `custom value added by versioner`;
	}

	Convert(normalized: normalized.ResourceTwoProps, versioned: ResourceTwo, errors: adltypes.errorList){
		var v = new ResourceTwo();
		v.prop1 = normalized.prop1;
		v.prop2 = normalized.prop2;
		return v;
	}
}
