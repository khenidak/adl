import *  as adltypes from '@azure-tools/adl.types'
/* the below allows arm developer to define resources without having to
 * worry about arm tracking information
 */
export type SubscriptionId = string;
export type Location = string;
export type ResourceGroup = string;

// Arm common data types.
export type ArmResourceId = string & adltypes.MustMatch<'TODO: ARM RESOURCE ID REG EXP'>
export type ResourceType = string & adltypes.MustMatch<'TODO: ARM RESOURCE TYPE REG EXP'>
export type ArmResourceName = string & adltypes.MustMatch<'TODO: ARM RESOURCE TYPE REG EXP'>;

// ArmCommonNormalized is arm common properties for normalized resource
// props is what is provided by arm rp api designer.
// props needs to be a class
export class ArmCommonNormalized<props extends adltypes.Normalized>{
	name: ArmResourceName;
	id: ArmResourceId;
	resourceGroup: ResourceGroup;
  location: Location;
	type: ResourceType;
  tags?: adltypes.Dictionary<string>;
	etag?: string;
	properties: props;
}


// ArmCommonNormalizer is  normalizer for ArmCommonNormalized
// it wraps provided normalizer into a larger normalizer
export class ArmCommonNormalizer<props extends adltypes.Normalized, normalizer extends adltypes.Normalizer<props>>{
	Default(obj: ArmCommonNormalized<props>, errors: adltypes.errorList) : void {
			//TODO default arm resource and then default inner props
	}

	Validate (old: ArmCommonNormalized<props> | undefined, newObject: ArmCommonNormalized<props>, errors: adltypes.errorList) : void{
			//TODO  validate arm resource and then validate inner prop
	}
}


// CustomArmNormalizedResource extends adl own with arm specific fiellds
// note:
// 1. we wrap provided props with our arm own defs
// 2. we wrap provided normalizer with arm's
export interface CustomArmNormalizedResource<name extends string, props extends adltypes.Normalized, normalizer extends adltypes.Normalizer<props>> extends adltypes.CustomNormalizedApiType<name, ArmCommonNormalized<props>, ArmCommonNormalizer<props, normalizer>>{
}

// This is the *auto* converted version. Arm can use its own auto converters to do fancy stuff as needed.
export interface ArmNormalizedResource<name extends string, props extends adltypes.Normalized>
				extends CustomArmNormalizedResource<name, props, adltypes.AutoNormalizer<props>>{
}



// ArmCommon is common arm properties for a versioned resource
export class ArmCommon<versionedProps extends adltypes.Versioned>{
	// TODO: do we need this?
	apiVersion?: string; // TODO: version  validation
	name: ArmResourceName;
	id: ArmResourceId;
	resourceGroup: ResourceGroup;
  location: Location;
	type: ResourceType;
  tags?: adltypes.Dictionary<string>;
	etag?: string;
	properties: versionedProps;

}

//ArmCommonVersioner is the versioner of common properties for a versioned resource
// we have avoided inhiriting ArmCommonNormalized to allow normalized and versioned
// to grow as needed with dep on the other
// TODO: call nested
class ArmCommonVersioner<props extends adltypes.Normalized, versionedProps extends adltypes.Versioned, versioner extends adltypes.Versioner<props, versionedProps>> {
	// Normalize performs conversion from versioned api type => normalized api type
	Normalize(versioned: ArmCommon<versionedProps>, normalized: ArmCommonNormalized<props>, errors: adltypes.errorList) : void{
					//TODO
			}

	// Convert performs conversion from normalized api type => versioned api type
	Convert(normalized: ArmCommonNormalized<props> , versioned: ArmCommon<versionedProps>, errors: adltypes.errorList): void{
				 // TODO
	}
}

// CustomArmResource is a versioned api type. Note
// we wrap provided props and version with arm own
export class CustomArmResource<baseName extends string, displayName extends string,props extends adltypes.Normalized, versionedProps extends adltypes.Versioned,versioner extends adltypes.Versioner<props,versionedProps>>
						implements adltypes.CustomApiType <baseName, displayName, ArmCommonNormalized<props>, ArmCommon<versionedProps>, ArmCommonVersioner<props, versionedProps, versioner>>{
}


export class ArmResource<name extends string, displayName extends string, props extends adltypes.Normalized, versionedProps extends adltypes.Versioned> implements CustomArmResource<name, displayName, props, versionedProps, adltypes.AutoVersioner<props,versionedProps>>{
}

