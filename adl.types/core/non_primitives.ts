import * as adltypes from './adl'
import * as constraints from '../constraints/module'

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
export interface Dictionary<T>  extends adltypes.AdlDataType{
  [key: string]: T;
}

/* non primitive types
 * these are the types that require scalar+validation
 * eg uri uuid both require a specialized form of a string
 */

/** a value representing a Calendar date */
export interface Date extends adltypes.AdlDataType {}

/** a value representing a Time */
export  interface Time extends adltypes.AdlDataType {}


/** a duration
 *
 * @todo - format?
*/
export type duration = string & adltypes.AdlDataType;

/** a universally unique ID */
export type uuid = string &
									 adltypes.AdlDataType &
									 constraints.MustMatch<'^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}){1}$'>;

/** A Uniform Resource Identifier (URI) is a string of characters that unambiguously identifies a particular resource.
 *
 * @see https://en.wikipedia.org/wiki/Uniform_Resource_Identifier
*/
export type uri = string &
									adltypes.AdlDataType &
									constraints.MustMatch<'^[A-Za-z][A-Za-z0-9+\-.]*:.*^'>;

/** a single character  */
export type char = string &
									 adltypes.AdlDataType &
									 constraints.MinLength<1> & constraints.MaxLength<1>;

/** an ISO 8601 Date format
 *
 * @todo - should this have a MustMatch?
 */
export type date = string & Date;

/** an ISO 8601 DateTime format
 *
 * @todo - should this have a MustMatch?
 */
export type datetime = string & Date & Time;

/** an RFC 1123 date time format
 *
 * @todo - should this have a MustMatch?
*/
export type datetimeRfc1123 = string & Date & Time;


 /** a value encoded as base64 */
export  interface Base64 extends adltypes.AdlDataType {}

  /** a value encoded as raw text (do not UriEncode for transport)  */
export  interface Raw extends adltypes.AdlDataType{}
