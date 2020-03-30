// core adl type system
import * as adltypes from '@azure-tools/adl.types'


// my api defs.
import { VirtualMachineNormalized } from './vm'
import { ResourceTwoNormalized, RespourceTwoNormalizer} from './resource_two'
import { ResourceThreeProps } from './resource_three'
import { ResourceFourProps } from './resource_four'



// normalized resources


// virtual machine normalized type. it does not need any imperative
// defaulting or validation, so we are not defining any
//TODO: when https://github.com/dsherret/ts-morph/issues/793 is fixed
export type VirtualMachine = adltypes.NormalizedApiType<'vm', VirtualMachineNormalized>;


//resource two normalized. That one require imparive and declarative work
export type ResourceTwo = adltypes.CustomNormalizedApiType<'resource_two', ResourceTwoNormalized, RespourceTwoNormalizer>;

// resource three is all declarative. note ResourceThree is unwrapped
export type ResourceThree = adltypes.NormalizedApiType<'resource_three', ResourceThreeProps>;

// resource four is all declarative
export type ResourceFour = adltypes.NormalizedApiType<'resource_four', ResourceFourProps>


// export properties so versioned decleration can see it
export * from './vm'
export * from './resource_two'
export * from './resource_three'
export * from './resource_four'


// TODO: remove when loadable runtime feat is done
// we need that because the load logic verify that the library loaded has the
// versioner
export * from '@azure-tools/arm.adl'

