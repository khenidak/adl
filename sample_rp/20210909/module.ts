
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
import { VirtualMachine20210909 }  from '../20210909/vm'

// NOTE: We are importing from older version, because we need it as is
import * as v20200909 from '../20200909/module'

import { ResourceFour, ResourceFourVersioner } from './resource_four'
// importing my normalized types
import * as core from '../normalized/module'



// vm is a top level resource
// note: VM does not require any special conversion logic so wre are composing it with  AutoVersioned<T>
// since all fields are mapped. (The cli --validate command will catch situations where fields are not)
export type vm_resource_20210909 = adltypes.ApiType<'vm', 'virtualmachine', core.VirtualMachineNormalized, VirtualMachine20210909>;

// carry resource two as is, i don't need to define it
export { two_resource_20200909  } from '../20200909/module'


/* notice: no resource 3. this version does not have it */
export type four_20210909 = adltypes.CustomApiType<'resource_four', 'resource-four', core.ResourceFour, ResourceFour, ResourceFourVersioner>;

// any imperative code needs to be exported at the package level
export { ResourceFourVersioner } from './resource_four'
