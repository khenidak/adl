import * as adltypes from '@azure-tools/adl.types'
import * as armtypes from '@azure-tools/arm.adl'

type somethingSpecial = string & adltypes.MustMatch<'^s', true>;

interface VirtualMachineProps{
    /**
    *  this is a property documentation, i can here describe the property for user facing doc. I can also
    *  provide tags. the farmework can help in asserting that certain tags are exposed. make sure that docs
    *  have no spelling mistakes.. etc ..etc
    *
    *  @prop_tag1 because we are using jsdoc, we can use tags. those are also exposed to whoever consumes the model
    *  @prop_tag2 also, consumer can ensure documentation conformation for example mandatory tags
    */
    vmId : string & adltypes.ReadOnly & adltypes.MaxLength<5> & adltypes.MinLength<2> & adltypes.Nullable;

    hardwareProfile: HWProfile;
    storageProfile: ImageReference;

    dataDisks: DataDisk[] &
               adltypes.MaxItems<128>;

    totalCores?: number;

    v1Prop: adltypes.int64 &
            adltypes.Range<5, 10>;

    v2Prop?: string &
             adltypes.DefaultValue<'defaulted  declartively'>;

  v3Prop?: adltypes.int64 &
           adltypes.MultipleOf<3> &
           adltypes.MultipleOf<5>;

    /**
    *  this is another property documentation, i can here describe the property for user facing doc. I can also
    *  provide tags. the farmework can help in asserting that certain tags are exposed. make sure that docs
    *  have no spelling mistakes. note in my doc, i don't say data type, version name, optionality, validation
    *  those all are enumerated by the framework and surfaced to the model
    *
    *  @prop_tag1 because we are using jsdoc, we can use tags. those are also exposed to whoever consumes the model
    *  @prop_tag2 also, consumer can ensure documentation conformation for example mandatory tags
    */
    networkCards?: adltypes.AdlMap<string, NetworkCard>;

    specials: somethingSpecial[];

	userProfile?: UserProfile;
}

interface ImageReference{
    publisher:string &
              adltypes.MinLength<2> &
              adltypes.MaxLength<50>;

    offer:string &
          adltypes.DefaultValue<'windows'>;

    sku: string;

    version: string &
             adltypes.MustMatch<'^[-\\w\\._\\(\\)]+', /*ignoreCase*/ true>;
}

interface DataDisk {
    diskId: armtypes.ArmResourceId; // note: custom type
    diskSize?: number & adltypes.DefaultValue<160>;
    //defaulted boolean
    isUltra?: boolean & adltypes.DefaultValue<false>;
    // undefauled boolean
    isSSD?: boolean;
}

interface HWProfile {
    virtualMachineSize: string & adltypes.DefaultValue<'ds_v2'>;
}

interface NetworkCard{
    networkCardId: armtypes.ArmResourceId;
    networkName?: string & adltypes.DefaultValue<'my_net_name'>;
}

interface PasswordProfile{
    password?: string;
    publicKey?: string;
}

interface UserProfile{
    username?: string;
    passwordProfile?: PasswordProfile;
}
// we have defined this resource, but we want arm core properties, so we envelop it
export type VirtualMachineNormalized = armtypes.ArmNormalizedResource<VirtualMachineProps>;
