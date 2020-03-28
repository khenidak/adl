import { ApiTypeConstraint } from './types'

/* this type is a read only, and can not be created by the user*/
export interface ReadOnlyType extends ApiTypeConstraint{}

/* this type is a write only, and users an write but can never read*/
export interface WriteOnlyType extends ApiTypeConstraint{}
