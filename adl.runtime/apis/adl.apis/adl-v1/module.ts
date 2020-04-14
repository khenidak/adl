import * as adltypes from '@azure-tools/adl.types'

import * as e from './error'
import * as el from './errorlist'
import * as apisnormalized from '../normalized/module'


/**
 *  error defines a versioned error, tools, clients (basically everything except adlruntime) should snap
 *  to the versioened view of an error. the internal error representation (in adl.types) is meant to be used
 *  by the machinery.
 */
export type error_adlv1 = adltypes.CustomApiType<'error', 'error', apisnormalized._error, e.error, e.errorVersioner>;

/**
 *  error defines a versioned errorList, tools, clients (basically everything except adlruntime) should snap
 *  to the versioened view of an error. the internal error representation (in adl.types) is meant to be used
 *  by the machinery.
 */
//!!! DON NOT USE UNTIL ADL SUPPORTS ROOT ARRAY TYPES !!!
export type errorList_adlv1 = adltypes.CustomApiType<'errorlist', 'errorlist', apisnormalized._errorList, el.errorList, el.errorListVersioner>;


export { errorVersioner } from './error'
export { errorListVersioner } from './errorlist'
