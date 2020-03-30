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
//TODO
//  tags?: adltypes.Dictionary<string>;
    etag?: string;
    properties: props;
}


// ArmResourceNormalizer normalizes arm resource
// Resources that needs imperative normalizer must use
// use this one
// Note: we relay on auto conversion for arm core (for now).
export class ArmnNormalizer<props extends adltypes.Normalized,
                            normalizer extends adltypes.Normalizer<props>>{
    Default(obj: ArmNormalizedResource<props>, errors: adltypes.errorList) : void {
        const actual:normalizer = {} as normalizer;
        actual.Default(obj.properties, errors);
    }

    Validate (old: ArmNormalizedResource<props> | undefined, newObject: ArmNormalizedResource<props>, errors: adltypes.errorList) : void{
        const actual:normalizer = {} as normalizer;
        actual.Validate(old ? old.properties : undefined, newObject.properties, errors);
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
//TODO
  //tags?: adltypes.Dictionary<string>;
    etag?: string;
    properties: versionedProps;

}

class ArmVersioner<normalizedProps extends adltypes.Normalized,
                                    versionedProps extends adltypes.Versioned,
                                    versioner extends adltypes.Versioner<normalizedProps, versionedProps>>
                                    implements adltypes.Versioner<ArmNormalizedResource<normalizedProps>, ArmNormalizedResource<versionedProps>>{
    // normalize performs conversion from versioned api type => normalized api type
    Normalize(versioned: ArmVersionedResource<versionedProps>, normalized: ArmNormalizedResource<normalizedProps>, errors: adltypes.errorList) : void{
                const actual: versioner = {} as versioner;
                actual.Normalize(versioned.properties, normalized.properties, errors);
            }

    // convert performs conversion from normalized api type => versioned api type
    Convert(normalized: ArmNormalizedResource<normalizedProps> , versioned: ArmVersionedResource<versionedProps>, errors: adltypes.errorList): void{
                const actual: versioner = {} as versioner;
                actual.Convert(normalized.properties, versioned.properties, errors);
    }
}
