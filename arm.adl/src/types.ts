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


// Arm envelop for normalized resource
export class ArmNormalizedResource<props extends adltypes.Normalized>{
    name: ArmResourceName;
    id: ArmResourceId;
    resourceGroup: ResourceGroup;
    location: Location;
    type: ResourceType;
    tags?: adltypes.AdlMap<string & adltypes.MinLength<256>, string & adltypes.MaxLength<256>>;
    etag?: string;
    properties: props;
}


// ArmResourceNormalizer normalizes arm resource
// Resources that needs imperative normalizer must use
// use this one
// Note: we relay on auto conversion for arm core (for now).
export class ArmNormalizer<props> implements adltypes.Normalizer<ArmNormalizedResource<props>>{
    Default(obj: ArmNormalizedResource<props>, errors: adltypes.errorList) : void {
        // no-op
    }

    Validate (old: ArmNormalizedResource<props> | undefined, newObject: ArmNormalizedResource<props>, errors: adltypes.errorList) : void{
        //no-op
    }
}

// Arm envelop for versioned resource.
export class ArmVersionedResource<versionedProps extends adltypes.Versioned>
                        implements adltypes.Versioned{
    apiVersion?: string; // TODO: version  validation
    name: ArmResourceName;
    id: ArmResourceId;
    resourceGroup: ResourceGroup;
    location: Location;
    type: ResourceType;
  	tags?: adltypes.AdlMap<string, string>;
    etag?: string;
    properties: versionedProps;

}

export class ArmVersioner<normalizedProps extends adltypes.Normalized,
                          versionedProps extends adltypes.Versioned>
                          implements adltypes.Versioner<ArmNormalizedResource<normalizedProps>, ArmNormalizedResource<versionedProps>>{
    // normalize performs conversion from versioned api type => normalized api type
    Normalize(versioned: ArmVersionedResource<versionedProps>, normalized: ArmNormalizedResource<normalizedProps>, errors: adltypes.errorList) : void{
        //no-op
    }

    // convert performs conversion from normalized api type => versioned api type
    Convert(normalized: ArmNormalizedResource<normalizedProps> , versioned: ArmVersionedResource<versionedProps>, errors: adltypes.errorList): void{
        //no-op
    }
}
