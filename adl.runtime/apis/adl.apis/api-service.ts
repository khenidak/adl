import * as adltypes from '@azure-tools/adl.types'


export type apiVersion_adlv1 = adltypes.ApiVersion<"adl-v1", "adl-v1"> & adltypes.ModuleName<"adl-v1">;


export * from './normalized/module'
export * from './adl-v1/module'
