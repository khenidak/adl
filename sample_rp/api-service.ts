import * as adltypes from '@azure-tools/adl.types'


/* Here is the definition of a service
 * note there is no definition of "service" and its metadaa as
 * name, description, version etc. All of this is expected to be in meta api.
 */

//these are all the types involved in this service definition
export * from './normalized/module'
export * from './20200909/module'
export * from './20210909/module'

/**
 *  this is version specific documentation, i can here talk about the version, what has been introduced to it.
 *  note, i don't need to talk about types, changes, all of this metadata are surfaced to the model or runtime
 *  for example a diff call can tell documentation about change log.
 *
 *  @version_tag1 we also support tags, tags can provide valua key/value information
 *  @version_tag2 we can also enforce that certain tags are provided.
 *  @version_tag3 we can also enforce rules such as spelling/grammer check
 */
export type apiVersion_20200909 = adltypes.ApiVersion<'2020-09-09', 'fancy-display-name'> &
                                                                    adltypes.ModuleName<'20200909'>;

/**
 *  this is another version specific documentation, i can here talk about the version, what has been introduced to it.
 *  note, i don't need to talk about types, changes, all of this metadata are surfaced to the model or runtime
 *  for example a diff call can tell documentation about change log.
 *
 *  @version_tag1 we also support tags, tags can provide valua key/value information
 *  @version_tag2 we can also enforce that certain tags are provided.
 *  @version_tag3 we can also enforce rules such as spelling/grammer check
 */
export type apiVersion_20210909 = adltypes.ApiVersion<'2021-09-09', 'fancy-display-name'> &
                                                                    adltypes.ModuleName<'20210909'>;
