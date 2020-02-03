import * as adltypes from '@azure-tools/adl.types'
import * as normalized from '../normalized/module'



export class ResourceFour{
	// prop 1 is carried over as is. because it matches
	// the name in normalized version, the convertor will
	// convert it automatically
	prop1: string;

	// note the missing prop2
	// we can use adlTypes.Remove if we were subclassing. as displayed
	// in other examples.


	// prop3: was just introduced here in v2020
	// similarlly we don't need any conversion logic
	prop3: string;


	//renamed from prop4
	// here i am using the declarative approach (MapTo)
	// i can also use Normalize() and Convert and use imperative
	// approach. Declarative is always prefered.
	prop4Ex: string &  adltypes.MapTo<'prop4'>;


	// notice how we are not listing any possible value
	// client SDK knows that the base property type is number
	// and possible values are whatever we decided. That means
	// changing the possible value DOES NOT BREAK existing clients
	// because clients are not generating enums for this property
	enum1: number;


	// this has changed type from string to number
	prop5: number;


	// prop6 was a singlar now it is an array
	prop6: string[];
}


export class ResourceFourVersioner implements adltypes.Versioner<normalized.ResourceFourProps, ResourceFour>{
	Normalize(versioned: ResourceFour, normalized: normalized.ResourceFourProps, errors: adltypes.errorList){
		var  n : normalized.ResourceFourProps = {} as normalized.ResourceFourProps;

		// note code here runs before auto normalization
		n.prop5 = versioned.prop5.toString();
		return n;
	}

	Convert(normalized: normalized.ResourceFourProps, versioned: ResourceFour, errors: adltypes.errorList){
		var v = new ResourceFour();

		// logic here to convert saved strings into
		// thier number. Changing the type of a property
		// is a big deal. not just because the need to convert
		// data into eq values in different types. but also
		// the need to deal with all the saved data.
		// below we make the decision that anything saved and
		// is not equal to fancy1 or fancy2 is equal to 100.
		// in real life cases, data might not be that clear.
		// SO PLEASE HANDLE CHANGING TYPES WITH ABOSLUTE CARE
		switch(normalized.prop5){
			case "fancy1": v.prop5 = 1;
			case "fancy2": v.prop5 = 2;
			default: v.prop5 = 100;
		}

		return v;
	}
}
