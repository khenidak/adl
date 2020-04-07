import *  as adltypes from '@azure-tools/adl.types'
// TODO: we should define constraints that allows use to express resource of specific provider and type
// example: NetworkCard = string & adltypes.DataType<'networkCard'> & ArmResourceId<'microsoft.network', 'card'>
// the definition of ArmResourceId will look like this ArmResourceId<provider, type> extends MustMatch<...>

export type SubscriptionId = string;
export type Location = string;
export type ResourceGroup = string;

// Arm common data types.

export type ArmResourceId = string & adltypes.DataType<'ArmResourceId'> &
                            adltypes.MustMatch<'\\/subscriptions\\/[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}\\/resourcegroups\\/[-\\w\\._\\(\\)]+\\/[-\\w\\._\\(\\)]+\\/*.'>
export type ResourceType = string & adltypes.MustMatch<'^[-\\w\\._\\(\\)]+'>
export type ArmResourceName = string & adltypes.MustMatch<'^[-\\w\\._\\(\\)]+'>;


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
    constructor(){}
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
    constructor(){}
}
