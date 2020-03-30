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


export interface VirtualMachine{
    vmId : string;
    hardwareProfile: HWProfile;
    storageProfile: ImageReference;
    dataDisks: DataDisk[];
    v1Prop: number;
    coreCount: number & adltypes.MapTo<'totalCores'>;
}

export interface HWProfile {
    vmSize: string & adltypes.MapTo<'virtualMachineSize'>;
}

export interface ImageReference{
    publisher: string;
    offer:string;
    sku: string;
    version: string;
}

export interface DataDisk {
    diskId: armtypes.ArmResourceId;
}

