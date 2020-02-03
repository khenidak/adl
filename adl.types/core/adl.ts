/*
 * below are the core api types. each api is expecte to be a:
 * normalized: an api that does not represent a specific version,
 * 	instead this is the in memory representation. every api exposed
 * 	to external users convert from and to this type. they are mapped
 * 	1:* with versioned api.
 * versioned: is a projection of a normalized api. they represent what your
 * 	client see. they look as differnt as needed
 * Note the interfaces are designed for completely stateless operation
 * to allow composability e.g. type myNormalizedType = props & normalizer
 *
 * Note the below forces apis designers to to casting when implementing custom
 * normalizer (defaulter/validator) or versioner. We can get around this with
 * generics.
 * Pros: avoids that one casting when doing custom stuff.
 * Cons: makes apis designer life hell otherwise when specing types it will be
 * 	interface MyFancyType extends Normalize<MyFancyType>
 *
 * ** note in all cases, the runtime ensures that the correct type is passed in
 * ** to these functions
 */


export interface Normalized{
}

export interface Versioned{
}

export interface Normalizer<N extends Normalized> {
 Default(obj: N, errors: errorList) : void;
	// Validate is called with
	// (undefined, new, errorlist) in case of object creation
	// (old, new, update) in case of object update
	Validate (old: N | undefined, newObject: N, errors: errorList) : void;
}

/*  versioner. Perfroms conversion from
 *  normalized => versioned
 *  versioned => normalized
 */
// TODO: should the framework create instance of N and V instead
// of them being returned?
export interface Versioner<N extends Normalized,V extends Versioned>{
	// Normalize performs conversion from versioned api type => normalized api type
	Normalize(versioned: V, normalized: N, errors: errorList) : void;
	// Convert performs conversion from normalized api type => versioned api type
	Convert(normalized: N, versioned: V,errors: errorList): void;
}


/* error type is the only type defined at the global leve
 * because it is used in conversion and validation
 */

 /* describes a field path/location */
export class fieldDesc {
	public parent:fieldDesc | undefined;
	public index: number = -1;

	//Name of the field
	name:string;

	get path():string{
		var p = (this.parent != undefined)? this.parent.path : "";
	if(this.index > -1){
		return p + "[" + this.index + "]"
	}

		return ((p.length > 0) ?  (p + ".") : "") + this.name;
	}

	constructor();
	constructor(name: string);
	constructor(name: string, parent: fieldDesc)
	constructor(name?: string, parent?: fieldDesc){
		if(name != undefined) this.name = name;
		if(parent != undefined) this.parent = parent;
	}



		//TODO:
		// Field description performs two jobs.
		// 1- For the error producer to identify where the error is. The error can be
		// -- top level error e.g. 404 in this case fieldDesc is not needed
		// -- top level property error e.g VirtualMachine.Network == null
		// -- netsted property error e.g. VirtualMachine.Network.Nic.Name == null
		// -- indexed (at any level) item error. e.g VirtualMachine.Network.Rules[0].Destination is null
		// 2- for consumers
		// The error should do the following
		// 2.1 Allow consumers to identify the field by walking a tree or a linked list like structure
		// consistently provide a toString() which renders the field desc *consistently* no matter what is the type of the error/underlying type.
}

// error carries anytype of error. Validation, conversion
// even processing errors. This is the implementation of normalized
// error. error is not meant to be saved in storage.
export class error{
	errorType : string;
	errorMessage: string;
 field: fieldDesc | undefined;


	// TODO: helpers to add childfield
	//	TODO: define all common errors in the base such as
	// not found
	// required
	// immutable
	// out of range
	// ..
}

// errorList is a list of errors
export class errorList extends Array<error>{}


// represents adl data types, any primitive or non-primitive must exten this type.
export interface AdlDataType{}

