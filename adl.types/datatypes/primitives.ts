import { DataType } from './types'
import * as adlconstraints from '../constraints/module'

/** the accuracy in bits with which a number can be represented. */
export  interface Precision<bits extends number> extends adlconstraints.PropertyConstraint{}

/** an 8 bit integer value */
export type int8 = number & Precision<8> & DataType<"int8">;

/** an 8 bit integer value */
export type byte = number &  Precision<8> & DataType<"byte">;

/** a 16 bit integer value */
export type int16 = number &  Precision<16> & DataType<"int16">;

/** a 32 bit integer value */
export type int32 = number &  Precision<32> & DataType<"int32">;

/** a 32 bit integer value */
export type integer = number &  Precision<32> & DataType<"int32">;

/** a 64 bit integer value */
export type int64 = number & Precision<64> &  DataType<"int64">;

/** a 64 bit integer value */
export type long = number &  Precision<64> & DataType<"long">;

/** a 32 bit floating point value */
export type float = number &  Precision<32> & DataType<"float">;

/** a 32 bit floating point value */
export type float32 = number &  Precision<32> & DataType<"int32">;

/** a 64 bit floating point value */
export type float64 = number &  Precision<64> &  DataType<"int64">;

/** a 64 bit floating point value */
export type double = number &  Precision<64> & DataType<"double">;
