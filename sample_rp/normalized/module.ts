// core adl type system
import * as adltypes from '@azure-tools/adl.types'


// my api defs.
import { VirtualMachineProps } from './vm'
import { ResourceTwoProps, ResourceTwoPropsNormalizer} from './resource_two'
import { ResourceThreeProps } from './resource_three'
import { ResourceFourProps } from './resource_four'



// normalized resources


// virtual machine normalized type. it does not need any imperative
// defaulting or validation, so we are not defining any
//TODO: when https://github.com/dsherret/ts-morph/issues/793 is fixed
//export type VirtualMachine = adltypes.NormalizedApiType<'vm', VirtualMachineProps>
export type VirtualMachine = adltypes.CustomNormalizedApiType<'vm', VirtualMachineProps, adltypes.AutoNormalizer<VirtualMachineProps>>;


//resource two normalized. That one require imparive and declarative work
export type ResourceTwo = adltypes.CustomNormalizedApiType<'resource_two', ResourceTwoProps, ResourceTwoPropsNormalizer>;


// resource three is all declarative
//export type ResourceThree = adltypes.NormalizedApiType<'resource_three', ResourceThreeProps>;
export type ResourceThree = adltypes.CustomNormalizedApiType<'resource_three', ResourceThreeProps, adltypes.AutoNormalizer<ResourceThreeProps>>;

// resource four is all declarative
//export type ResourceFour = adltypes.NormalizedApiType<'resource_four', ResourceFourProps>;
export type ResourceFour = adltypes.CustomNormalizedApiType<'resource_four', ResourceFourProps, adltypes.AutoNormalizer<ResourceFourProps>>;


// export properties so versioned decleration can see it
export * from './vm'
export * from './resource_two'
export * from './resource_three'
export * from './resource_four'

