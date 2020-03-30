import * as constraints from '../constraints/module'


// represents adl data types, any primitive or non-primitive must exten this type.
export interface DataType<name extends string> extends constraints.PropertyConstraint {}

