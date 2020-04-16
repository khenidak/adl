/*
 * versioned api type. This type can mape to one or a composite
 * typically they map 1:1 to an normalized type.
 * for versioned types we don't need to spec how it is defaulted
 * or versioned, we just need to spec how it is converted
 * we have three choices
 * -- it mapes 1:1 directly to a normalized type
 * -- it maps 1:1 but there are fields that has changed/renamed.
 *    for that you can use intersection.
 * -- the type is complex and require custom conversion code
 *
 * for the first two types just use auto conversion
 */

import * as adltypes from '@azure-tools/adl.types'
import * as armtypes from '@azure-tools/arm.adl'

type somethingSpecial = string & adltypes.MustMatch<'^s', true>;

export interface VirtualMachineProps{
    /**
    *  this is a property documentation, i can here describe the property for user facing doc. I can also
    *  provide tags. the farmework can help in asserting that certain tags are exposed. make sure that docs
    *  have no spelling mistakes.. etc ..etc
    *
    *  @prop_tag1 because we are using jsdoc, we can use tags. those are also exposed to whoever consumes the model
    *  @prop_tag2 also, consumer can ensure documentation conformation for example mandatory tags
    */
    vmId : string & adltypes.Nullable;

    hardwareProfile: HWProfile;

    storageProfile: ImageReference;

    dataDisks: DataDisk[];

    v1Prop: number;

    v3Prop?: adltypes.int64 &
             adltypes.MultipleOf<3> &
             adltypes.MultipleOf<5>;

    v4Prop?: adltypes.int64[] &
             adltypes.MaxItems<4> &
             adltypes.MinItems<2>;

    coreCount: number & adltypes.RenameTo<'totalCores'>;

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
    /**
     * the following is a list of properties that has a major structure change. normalized define
     * them in a complex nested type. using MoveTo constraint the spec author can remap these
     * without having to write imperative conversion logic
    */
 	username: string & adltypes.MoveTo<'$.properties.userProfile.username'>;
    password: string & adltypes.MoveTo<'$.properties.userProfile.passwordProfile.password'>;
    publicKey: string & adltypes.MoveTo<'$.properties.userProfile.passwordProfile.publicKey'>;
    /**
     * this is an enum example. adl defines enum as base type (in this case string)
     * and possible values. this allows spec author to add more possible values when
     * needed without breaking existing versions. enums can be defined per version
     * with the following rules in mind:
     * -- normalized has to be the union of *all* possible values of all versions
     * -- the base enum type is the same across all versions. otherwise it will require
     * conversion
    */
    boxColor: string & adltypes.OneOf<['red', 'green', 'blue']>;
}

export interface HWProfile {
    vmSize: string & adltypes.RenameTo<'virtualMachineSize'>;
}

export interface ImageReference{
    publisher: string;
    offer:string;
    sku: string;
    version: string;
}

export interface DataDisk {
    diskId: armtypes.ArmResourceId;
    isSSD?: boolean;
}

interface NetworkCard{
    networkCardId: armtypes.ArmResourceId;
}

// for this resource we want to envelop it in ARM. so we are doing this:
export type VirtualMachine20200909 = armtypes.ArmVersionedResource<VirtualMachineProps>;
