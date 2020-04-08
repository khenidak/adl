import { ConversionConstraint } from './types'


// Conversion constraints are used to map and convert properties from
// versioned  => normalized
// normalized => versioned

// maps the property from one location to another
export interface RenameTo<targetName extends string> extends ConversionConstraint{}

// moves one property to another in the target
export interface MoveTo<targetJsonPath extends string> extends ConversionConstraint{}


