import * as adltypes from '../core/adl'
import * as automachinery from '../core/auto_machinery'
/*meta describes an metadata data for service, api version and so on */


// Normalized api is an api that:
// 1. has properties
// 2. can be defaulted
// 3. can be validated
export interface CustomNormalizedApiType<
                                         name extends string, /* identifier, allows versioned=>normalized linking */
                                         props extends adltypes.Normalized,  /* a class that holds the properties of this api */
                                         normalizer extends adltypes.Normalizer<props>   /* The implementation of defaulting/validation */
                                        >{

}

// NormalizedApiType is CustomNormalizedApiType that is a 100% declarative. it does not use
// any imperative code to perform validation or defaulting. it relays on the automachinery
// implementation
export interface NormalizedApiType<name extends string, props extends adltypes.Normalized>
                                    extends CustomNormalizedApiType<name, props, automachinery.AutoNormalizer<props>>{
}


// CustomApiType  is a *versioned* projection of a normalized type. This is what a typical
// api server exposes to the outside world
export interface CustomApiType<
                                baseName extends string,   /* identifier, allows versioned=>normalized linking */
                                displayName extends string,    /* display name */
                                props extends adltypes.Normalized, /* a class that holds the properties of this api */
                                versionedProps extends adltypes.Versioned, /* versioned props*/
                                versioner extends adltypes.Versioner<props,versionedProps>,    /* convertor */
                               >{

}

// ApiType allows user to use a 100% declarative model. it relays on
// the auto machinery implementation.
export interface ApiType<
                         name extends string,
                         displayName extends string,
                         props extends adltypes.Normalized,
                         versionedProps extends adltypes.Versioned>
                         extends CustomApiType<name,
                                               displayName,
                                               props,
                                               versionedProps,
                                               automachinery.AutoVersioner<props,versionedProps>
                                                >{
}

// describes an api verion
export interface ApiVersion<name extends string,
                                                        displayName extends string> {

}


export interface ModuleName<NAME extends string>{

}
