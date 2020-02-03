
import * as adltypes from '@azure-tools/adl.types'



// notice Prop3 is an enum. The way enums are defined
// are straight base type + list of values. That means
// different language generators can map them to whatever
// specific to language. for example (the below is a string);
// - golang will use `type aliasing` via `type someProp3Value= string`
// 		then define different values via `var v1 = someProp3Value(v1)`
// - c# will use `using x = string` then following the same approach
// 	 golang by defining variables of each value below
//
// that allows different versions of apis to add more enums values.
// this won't break older versions of apis because they expect "string"
// or possible values or a string.. not traditional enum
export interface ResourceThreeProps{
	someProp1: adltypes.int64 &
						 adltypes.DefaultValue<15>;
	someProp2: adltypes.datetime;

	someProp3: string &
						 adltypes.OneOf<['v1', 'v2', 'v3']>
}
