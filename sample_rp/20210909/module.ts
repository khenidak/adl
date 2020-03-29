
/*
 *this is a typical version export file
 * for evey type we need to spec:
 * - name
 * - reference to normalized version
 * - a convertor
 */

import * as adltypes from '@azure-tools/adl.types' // core adl types
import * as arm from '@azure-tools/arm.adl' // arm extentions to adl

// As an rp owner, these are my stuff

// Importing my version-ed types
import { VirtualMachine }  from '../20210909/vm'

// NOTE: We are importing from older version, because we need it as is
import { ResourceTwo } from '../20200909/resource_two'

import { ResourceFour, ResourceFourVersioner } from './resource_four'
// importing my normalized types
import * as core from '../normalized/module'



// vm is a top level resource
// note: VM does not require any special conversion logic so wre are composing it with  AutoVersioned<T>
// since all fields are mapped. (The cli --validate command will catch situations where fields are not)
export type vm_resource_20210909 = adltypes.ApiType<'vm', 'virtualmachine', core.VirtualMachine, VirtualMachine>;

// resource two is just another resource my rp exposes
export type two_20210909 = adltypes.ApiType<'resource_two', 'resource-two', core.ResourceTwo, ResourceTwo>;

/* notice: no resource 3. this version does not have it */
export type four_20210909 = adltypes.CustomApiType<'resource_four', 'resource-four', core.ResourceFour, ResourceFour, ResourceFourVersioner>;

// any imperative code needs to be exported at the package level
export { ResourceFourVersioner } from './resource_four'
