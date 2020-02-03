/*
 * A constraint is a declarative type used in intersection types to specify a runtime
 * validation: spec how an item will be validated
 * defaulting: spec how an item will be defauled
 * conversion: spec how an item will be converted
 * behavior: *other behvior*
 *
 * a constraint can be applied on a property or a type
 * note: adl.types defines the constraints without implementation
 * 			 adl.runtiume implement them
*/
// all constraint are identified by this interface
export interface ConstraintInterface{}
// constraints that apply on property must implement this interfae
export interface PropertyConstraint extends ConstraintInterface{}

// DefaultingConstraint is a constraint that performs defaulting on a property
export interface DefaultingConstraint extends PropertyConstraint{}

// ValidationConstraint is a constarint that performs validation on a property
export interface ValidationConstraint extends PropertyConstraint{}

// ConversionConstraint is a constraint that performs conversion on a property
export interface ConversionConstraint extends PropertyConstraint{}

// Behavior constraints are not implemented. They are annotation read by whoever
// processing the spec. adl and adlruntime has a specific set of well known
// behavior constraints
export interface PropertyBehaviorConstraint extends PropertyConstraint{}


// constraints that apply on types must implement this interface
export interface TypeConstraint extends ConstraintInterface{}
