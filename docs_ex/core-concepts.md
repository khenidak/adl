
# What is an api-type?

An api-type is a any concept in your apis domain. An api-type can be represented as
```typescript
person{
	firstName: string;
	lastName: string;
	addresses: address[];
	children: person[];
	motherMaidenName: string;
}
```
An api-type can also be used to model arbitrary `actions` in your apis domain. For example; a `gave birth` action can be modeled as 

```typescript
birth{
	babies: person[];
}
```

In adl `person` and `birth` are refered to - each -as `api-type`. `addresses`, `children` etc. are refered to - each - as `api-type property` or `property`

# Constraints

Constraints are central constructs to adl. A Constraint is a construct that can **limit** (validate value), **change** or **provide additional context** to whatever it applies on. In adl constraints are mainly be applied on:

1. api-types' properties.
2. api-types

> an api-type or a property can have zero or more constraints.

## Property constraints

An apis spec author can use validation constraints to define how property value can be validated. They can also use constraints to set default value for properties. An example for that is:

```
person{
	firstName: string & MinLength<4> & MaxLength<24>; /* min and max length of name property*/
	email: string & MustMatch<'^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$'> & Immutable; /* email property must match a regular expression and is immutable*/
	addresses: address[]; & MaxEntries<32> /*max element count of address array is 32 */
	children: person[];
	motherMaidenName: string;
	location: string & DefaultValue<'earth'>; /* sets the default location value to earth*/
}
```

> Property constraints are also used in conversion as discussed below.

## api-type constraints

((example here))

> adl provides a set of Constraints, authors can define additional constraints either per api-spec or centrally to be shared across multiple specs.


# apis composability and extensibility

adl supports composability and extensibility in multiple ways. Below are some examples:

## Custom data type definition

A spec author can define custom data types that can be reused within api types
```typescripe
// typically defined
type zipcode = number & MustMatch<'(^\d{5}$)|(^\d{9}$)|(^\d{5}-\d{4}$)'>;

// it can be then used as the following
interface Address{
	city: string;
	zipCode: zipcode; // reuse
}
```

## envelops

For systems that envelops all api-types into a custom envelop that carries additional metadata; a spec author can spec the envelop this way

```typescript
// typically defined in a file imported here
interface SystemEnvelop<props>{
	evenlopProperty1: string;
	evenlopProperty2: string;
	properties: props;
}

interaface personProps{
	firstName: string;
	/* rest of api definition */
}
// wrapping
type person = SystemEnvelop<personProps>; // Now person type is automatically an envelop that contains person.
```

## composing types from existing types
```typescript
inteface Address{
	city: string;
	zipCode: zipcode;
}
interface Person{
	firstName: string;
	address: Address; // <= composing as address
}
interface organization{
	name: string;
	addresses:Address[] & MaxEntries<10>; // though it is the same address, it is a list and has some constraints on it.
}
```

## extending existing types

An api-type can be designed in the traditional way of base and subclasses. This can be used to model related concepts in your domain. As an example:

```typescript
// base
interface ship{
	maxSpeed: number;
}
interface passengerShip extends ship{ // passengerShip contains all the properties of ship
	passengerCount: number;
}
interface oilTanker extends ship{
	maxCargoWeight: number;
}
```
> The above can also be exposed to the likes of swagger as polymorphic type via ((TBD))


# Representing versioned api-type


((diagram here))

Each adl api-type is assumed to support multiple versions by default. Spec author may still choose to project one version. In adl each api-type is represented by *one* normalized type. Normalized types are the internal representation of an api-type. Similar to what an api server will work with in memory or in storage. The *normalized* type and is then projected into to one or more *versioned* types. In a typical api server implementation, most - if not all - the logic is implemented against the normalized api-type. The following discussion point add more details to the concept

## Each versioned api-type is loosely coupled to one normalized api-type
Versioned api-type can have different shape (properties), name and constraints in each version. The relation to normalized is loosly coupled. The below example is a `person` api-type that is projected into two versions.

```typescript
// normalized
person{
	firstName: string;
	lastName: string;
	addresses: address[];
	children: person[];
	motherMaidenName: string;
	lastLogin: date; // internal property not projected in any version.
}

// v1
person{
	name: string, // different name than person(normalized).firstName
	lastName: string, // similar
	offspring: string[], // logically simiar to children, only carries their names (simple array vs. complex array).
}
```
> `v1` has less properties and has `offsprint` which logically equal to `children` but **of different data type**.


```typescript
// v2
person{
	name: string,
	lastName: string,
	children: person[], // similar to person(normalized).children
	motherMaidenName: string, // does not exist in v1 projection
}
```
> `v2` has less properties and has `motherMaidenName` which did not exist in `version-1`.

The apis spec author is free to model newer version to meet the requirements of their evolving apis domain. Conversion semantics are discussed in the api machinery section below.

## Conversion Rules


# representing an entire api specification

With the above in mind an api spec in adl looks like this:

1. represented as a typescript project. has a root file named `api-service.ts`
2. has one or more normalized types. normalized types are defined in './normalized/module/'
3. each normalized type is defined as the following:

```typescript
export type VirtualMachine = NormalizedApiType<'type name', class-or-interface-describing-the-api-type>;
```

3. has one or more api-versions. Each version is defined as the following in `api-service.ts`

```typescript
// module name is a directory name, example the below, the version is defined './version-x/module.ts'
export type apiVersion_20200909 = ApiVersion<'name', 'display-name'> & adltypes.ModuleName<'version-x'>;
```

4. each version can have multiple api-types defined (with no relation to any existing or new version). each is defined in './<version-name>/module.ts`

```typescript
export type vm_resource_20210909 = adltypes.ApiType<'name-of-normalized-type-backing-this-type',
					            'name-of-versined-api-type',
					             class-or-interface-representing-normalized-type,
						     class-or-interface-representing-versioned-type,
					           >;
```

> the directory `./sample_rp` contains an enteri api spec for reference

# api machinery
## Conversion Semantics

Each versioned api-type need to only convert to and from normalized version. This enables zero modification on existing versions upon introducing new versioned api-types (in most cases). adl supports the following:
1. auto conversion for api-types. Spec author does not need to specify how an api-type is converted to normalized version, fields that have matching name and data types are automatically converted.
2. using constraints. For example mapping `person(v1).name` to `person(normalized).firstName`.
3. imperative conversion, where the spec author provides typescript code to perform the conversion.
4. mix and match. An apis spec author can choose to mark some properties via metadata but leave the rest for auto and/or imperative conversion.

## Defaulting Semantics

An api-type within adl supports `defaulting`. `defaulting` is the act of supplying default values to properties that was not provided in input. An example would look similar to this:

```typescript
// api definition
{
	city: string & DefaultValue<'seattle'>;
	state: string & DefaultValue<'WA'>;
	street: string;
	number: number;
}

// input address type
{
	city:"",
	state: "",
	street: "405 h/w",
	number: 1,
}
// defaulted
{
	city:"seattle", // defauled
	state: "WA", // defaulted
	street: "405 h/w",
	number: 1,
}
```


 adl supports setting defaults in both `versioned` and `normalized` api-types as the following:

1. using constraints. For example an apis spec author wants mark `city` property as `defaulted to seattle`.
2. imperative defaulting. Where the spec author provides typescript code to perform the defaulting.
3. mix and match between the two

## Validation Semantics
The validation semantics follow the same model as conversion and defaulting semantics where either constraints, imperative code or mix of both is supported.


