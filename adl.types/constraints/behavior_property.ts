import { PropertyBehaviorConstraint } from './types'

// Runtime: this property has been removed from this version.
export interface Removed extends PropertyBehaviorConstraint{}

// Runtime: don't run auto conversion on this property
export interface NoAutoConversion extends PropertyBehaviorConstraint{}
