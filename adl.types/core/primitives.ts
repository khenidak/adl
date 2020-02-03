import * as adltypes from './adl'

/* date types */


/** the accuracy in bits with which a number can be represented. */
export  interface Precision<bits extends number> extends adltypes.AdlDataType {}

/** a whole number; a number that is not a fraction. */
export interface Integer extends adltypes.AdlDataType {}

/** a whole number; a  a fraction. */
export interface FloatingPoint extends adltypes.AdlDataType {};

/** an 8 bit integer value */
export type int8 = number & Integer & Precision<8>;

/** an 8 bit integer value */
export type byte = number & Integer & Precision<8>;

/** a 16 bit integer value */
export type int16 = number & Integer & Precision<16>;

/** a 32 bit integer value */
export type int32 = number & Integer & Precision<32>;

/** a 32 bit integer value */
export type integer = number & Integer & Precision<32>;

/** a 64 bit integer value */
export type int64 = number & Integer & Precision<64>;

/** a 64 bit integer value */
export type long = number & Integer & Precision<64>;

/** a 32 bit floating point value */
export type float = number & FloatingPoint & Precision<32>;

/** a 32 bit floating point value */
export type float32 = number & FloatingPoint & Precision<32>;

/** a 64 bit floating point value */
export type float64 = number & FloatingPoint & Precision<64>;

/** a 64 bit floating point value */
export type double = number & FloatingPoint & Precision<64>;

/** the number of seconds that have passed since 00:00:00 UTC Thursday, 1 January 1970. */
export type unixtime = number & adltypes.AdlDataType;
