import * as adltypes from '@azure-tools/adl.types'
import * as normalized from '../normalized/module'




export class ResourceFour{
	// prop 1 is carried over as is. because it matches
	// the name in normalized version, the convertor will
	// convert it automatically
	prop1: string;


	// prop2: is visible in v 2020
	prop2: string;


	// note prop3 is not here, it is only visible in v2021

	// prop4: is visible in v2020 but renamed in v2021
	prop4: string;


	// notice how we are not listing any possible value
	// client SDK knows that the base property type is number
	// and possible values are whatever we decided. That means
	// changing the possible value DOES NOT BREAK existing clients
	// because clients are not generating enums for this property
	enum1: number;


	// prop5 is a string in v2020
	prop5: string;

	//prop6: is a singluar here but multiple else where
	prop6: string;
}

export class ResourceFourVersioner_20200909 implements adltypes.Versioner<normalized.ResourceFourProps, ResourceFour>{
	Normalize(versioned: ResourceFour, normalized: normalized.ResourceFourProps, errors: adltypes.errorList){
		var n : normalized.ResourceFourProps = {} as  normalized.ResourceFourProps;

		n.prop6[0] = versioned.prop6; // set first field
		return n;
	}

	Convert(normalized: normalized.ResourceFourProps, versioned: ResourceFour, errors: adltypes.errorList){
		var v = new ResourceFour();
		if(normalized.prop6.length > 0) v.prop6 = normalized.prop6[0];

		return v;
	}
}
