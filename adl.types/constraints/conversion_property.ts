import { ConversionConstraint } from './types'


// Conversion constraints are used to map and convert properties from
// versioned  => normalized
// normalized => versioned

// tells auto conversion logic that the property has a different name on target
export interface RenameTo<sourceNameOrJPath extends string> extends ConversionConstraint{}

// tells auto conversion logic that the property has moved to a different part of the output object graph
export interface MoveTo<targetJsonPath extends string> extends ConversionConstraint{}

