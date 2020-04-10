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
