import { PropertyBehaviorConstraint } from './types'

// Runtime: this property has been removed from this version.
export interface Removed extends PropertyBehaviorConstraint{}

// Runtime: don't run auto conversion on this property
export interface NoAutoConversion extends PropertyBehaviorConstraint{}

/** nullable types. by default adl assumes that all
 * values are non-nullable unless this interface is
 * used to declare that the value. can be nullable
 */
export interface Nullable extends PropertyBehaviorConstraint{}
