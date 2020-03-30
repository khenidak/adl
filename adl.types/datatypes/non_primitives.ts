import { DataType } from './types'
import * as adlconstraints from '../constraints/module'
// TODO: these types needs to be validated

/** Gets the base type of a literal type */
type TypeOf<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends undefined ? undefined :
  object;

/** Specifies the value a discriminator to identify this schema */
type Kind<V> = V & TypeOf<V>;

/** Declares the property is a polymorphic discriminator */
type Discriminator<V> = V;

/** Version Restriction */
type Version<low, high = any> = any;


// TODO: Create a dictionary that has
// validation for keys and values
/** an dictionary of key(string)/value pairs */

export interface Dictionary<T> {
  [key: string]: T;
}

/* non primitive types
 * these are the types that require scalar+validation
 * eg uri uuid both require a specialized form of a string
 */

/** a value representing a Calendar date */
export type date = string & DataType<"date">;

/** a value representing a Time */
export type time = string & DataType<"time">;


/** a duration
 *
 * @todo - format?
*/
export type duration = string  & DataType<"duration">;

/** the number of seconds that have passed since 00:00:00 UTC Thursday, 1 January 1970. */
export type unixtime = number  & DataType<"unixtime">;

/** a universally unique ID */
export type uuid = string &
									 DataType<"uuid"> &
									 adlconstraints.MustMatch<'^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}){1}$'>;

/** A Uniform Resource Identifier (URI) is a string of characters that unambiguously identifies a particular resource.
 *
 * @see https://en.wikipedia.org/wiki/Uniform_Resource_Identifier
*/
export type uri = string &
									DataType<"uri"> &
									adlconstraints.MustMatch<'^[A-Za-z][A-Za-z0-9+\-.]*:.*^'>;

/** a single character  */
export type char = string &
									 DataType<"char"> &
									 adlconstraints.MinLength<1> & adlconstraints.MaxLength<1>;

/** an ISO 8601 DateTime format
 *
 * @todo - should this have a MustMatch?
 */
export type datetime = string & DataType<"datetime">;

/** an RFC 1123 date time format
 *
 * @todo - should this have a MustMatch?
*/
export type datetimeRfc1123 = string & DataType<"datetimeRfc1123">;


 /** a value encoded as base64 */
export  type base64 = string & DataType<"base64">;

//TODO:
 /** a value encoded as raw text (do not UriEncode for transport)  */
//export  interface Raw extends AdlDataType{}
