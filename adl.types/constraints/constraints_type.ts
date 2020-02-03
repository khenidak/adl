import { TypeConstraint } from './types'

/* this type is a read only, and can not be created by the user*/
export interface ReadOnlyType extends TypeConstraint{}

/* this type is a write only, and users an write but can never read*/
export interface WriteOnlyType extends TypeConstraint{}

/* all fields in this type are required*/
export interface AllRequired extends TypeConstraint{}
