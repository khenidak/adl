import * as adltypes from '../core/adl'

// General purpose deep comparer
// TODO prop name is field desc (root for root call)
export function deep_compare(
                                                        l: any | undefined,
                                                        r: any | undefined,
                                                        parent_field: adltypes.fieldDesc,
                                                        index: number = -1): boolean {

    if(l == r == undefined) return true;

    /*TODO*/
    return true;

}


// TODO: is this the best approach?
export function deep_clone<T>(src: any): T{
    return <T>JSON.parse(JSON.stringify(src))
}
