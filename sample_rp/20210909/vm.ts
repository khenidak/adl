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
// this is a vNext api. technically we just need to modify
// a little on top of what we already have.
// solution: extend what we have.

import * as vPrev from '../20200909/vm'
export interface VirtualMachine extends vPrev.VirtualMachineProps{
    badProp: string;
    v1Prop: number & adltypes.Removed; // <== removed
    v2Prop?: string // <== new;
    some_new_prop: number & adltypes.MapTo<'someProp'>;// This prop is renamed, we still don't need imperative logic
}

// for this resource we want to envelop it in ARM. so we are doing this:
export type VirtualMachine20210909 = armtypes.ArmVersionedResource<VirtualMachine>;
