/*
 *this is a typical version export file
 * for evey type/resource we need to spec:
 * - name
 * - reference to normalized version
 * - a convertor
 */

import * as adltypes from '@azure-tools/adl.types' // core adl types
import * as armtypes from '@azure-tools/arm.adl' // arm extentions to adl

// As an rp owner, these are my stuff

// Importing my version-ed types
import { VirtualMachine20200909 }  from './vm'
import { ResourceTwo20200909, ResourceTwo20200909Versioner } from './resource_two'
import { ResourceThree } from './resource_three'
import { ResourceFour, ResourceFourVersioner_20200909 } from './resource_four'


// importing my normalized types
import * as core from '../normalized/module'

// vm is a top level resource
// note: VM does not require any special conversion logic so wre are composing it with  AutoVersioned<T>
// Auto converter can convert between versions based on field names.
export type vm_resource_20200909 = adltypes.ApiType<'vm', 'virtualmachine', core.VirtualMachineNormalized, VirtualMachine20200909>;

// resource two uses custom versioner, hence it does not use the auto versioner stuff
export type two_resource_20200909 = adltypes.CustomApiType<'resource_two', 'resource-two',core.ResourceTwoNormalized, ResourceTwo20200909, ResourceTwo20200909Versioner>;

// resource three in this version is normal resource, nothing special about it
export type three_resource_20200909 = adltypes.ApiType<'resource_three', 'resource-three',core.ResourceThreeProps, ResourceThree> & adltypes.ReadOnlyType;

// resource four  has custom convertor
export type four_resource_20200909 = adltypes.CustomApiType<'resource_four', 'resource-four', core.ResourceFourProps,ResourceFour, ResourceFourVersioner_20200909>

// any imperative code needs to be exported at the package level
export { ResourceFourVersioner_20200909 } from './resource_four'
export { ResourceTwo20200909, ResourceTwo20200909Versioner } from './resource_two'

