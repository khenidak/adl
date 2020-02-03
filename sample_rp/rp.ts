import * as adltypes from '@azure-tools/adl.types'


/* Here is the definition of a service
 * note there is no definition of "service" and its metadaa as
 * name, description, version etc. All of this is expected to be in meta api.
 */

//these are all the types involved in this service definition
export * from './normalized/module'
export * from './20200909/module'
export * from './20210909/module'


export type apiVersion_20200909 = adltypes.ApiVersion<'2020-09-09', 'fancy-display-name'> &
													 				adltypes.ModuleName<'20200909'>;


export type apiVersion_20210909 = adltypes.ApiVersion<'2021-09-09', 'fancy-display-name'> &
													 				adltypes.ModuleName<'20210909'>;
