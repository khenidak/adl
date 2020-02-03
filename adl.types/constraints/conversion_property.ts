import { ConversionConstraint } from './types'


// Conversion constraints are used to map and convert properties from
// versioned  => normalized
// normalized => versioned

// maps the property from one location to another
export interface MapTo<sourceNameOrJPath extends string> extends ConversionConstraint{}
