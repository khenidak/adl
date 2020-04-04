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


/**
 *  This is the doc for this exposed versioned type. we can write whatever here. so we will use to document.
 *  the help on the example. vm is a top level api. VM does not require any imperative conversion logic. it is
 *  all defined using declarative approach. the machinery takes care of the rest
 *
 *  @tag1 because we are using jsdoc, we can use tags. those are also exposed to whoever consumes the model
 *  @tag2 also, consumer can ensure documentation conformation for example mandatory tags + spell check etc.
 */
export type vm_resource_20200909 = adltypes.ApiType<'vm', 'virtualmachine', core.VirtualMachineNormalized, VirtualMachine20200909>;


/**
 *  resource two uses custom versioner, hence it does not use the auto versioner stuff
 *  we don't need to use the tags to describe anything the model already describes such as data types, properties
 *  this is the top level doc for this api type
 *
 *  @tagAlpha anything we want, for systems that supports multiple api spec, tags can be consistent across all spec
 */
export type two_resource_20200909 = adltypes.CustomApiType<'resource_two', 'resource-two',core.ResourceTwoNormalized, ResourceTwo20200909, ResourceTwo20200909Versioner>;


/**
 *  resource three in this version is normal resource, nothing special about it. this is an example api type doc
 *  with no tags.
 *
 */
export type three_resource_20200909 = adltypes.ApiType<'resource_three', 'resource-three',core.ResourceThreeProps, ResourceThree> & adltypes.ReadOnlyType;

/**
 *  resource three in this version is normal resource, nothing special about it. this is an example api type doc
 *  with no tags.
 *
 */
export type four_resource_20200909 = adltypes.CustomApiType<'resource_four', 'resource-four', core.ResourceFourProps,ResourceFour, ResourceFourVersioner_20200909>


// any imperative code needs to be exported at the package level
export { ResourceFourVersioner_20200909 } from './resource_four'
export { ResourceTwo20200909, ResourceTwo20200909Versioner } from './resource_two'

