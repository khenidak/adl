/* resource four is where we are applying all possible changes as requested by rpaas
 * team as a demo for what this framework can do
*/

import * as adltypes from '@azure-tools/adl.types'


// demo for breaking changes conversions
export class ResourceFourProps{
    // prop1: will remain across the two demo versions
    prop1: string;

    // prop2: was visible in 2020 but not in 2021
    // because it v2021 will not have value for it
    // it must have a default value. or at least a validation
    // that allows default prop value:
    // string => ""
    // number => 0
    // class => null
  // etc.
    // in this case we chose to use a default value.
    prop2: string & adltypes.DefaultValue<'some-default'>;

    //prop3: was added in 2021 similar to removing a prop
    // it has to have a default value or acceptable (valid) prop
    // value, because any version before 2021 will not have a value
    // for it.
    prop3: string & adltypes.DefaultValue<'some-other-default'>;


    //prop4: has been remaned in v2021
    prop4: string;

    //enum1: is a number property that only accepts one
    // of possible values.
    enum1: number & adltypes.OneOf<[100,200,300,400]>;


    // prop5 is a property that has changed type
    // There are a couple of ways we can do that:
    // approach 1 (two properties):
    // use two properties in normalized version. each property has a
    // a type. map each version to the correct property type.
    // this allows us to map any possible prop5 into prop5Ex
    // AND allow us to carry possible un-transfarable values
    // into thier property. That means logic processing normalized
    // knows how to work with both fields.
    // AND conversion logic for pre type change knows how to handle
    // two fields (number and string) => one field (string)
    // approch 2 (one property):
    // Only work if every value in existing saved data can be transfered
    // from string to int.
    prop5: string;

    //prop6: is a property that was singular and then became an array
    // as usual there is a couple of approaches
    // approach1: convert the normalized.prop from singular to array
    // this only work if your serializer knows how to convert saved
    // data into an array.
    // approach2: use to properties
    // prop6.1 will be signlular and will be used for array[0]
    // prop6.2 will be array and will be used for array[1..]
    // when converting to old api version: (where it has singulary)
    // we will use prop.prop6.1
    // when converting to versions that has array we will:
    // version.array = join(prop6.1, prop6.2)
    // for this demo: we used approach

    // initially prop6 was just a string, as we evolve
    // we made it an array
    prop6: string[];
}
