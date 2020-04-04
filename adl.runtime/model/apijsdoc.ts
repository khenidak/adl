import  { TypeGuards, TypeAliasDeclaration, JSDoc, ClassDeclaration,  InterfaceDeclaration, PropertySignature, PropertyDeclaration } from 'ts-morph'

import * as adltypes from '@azure-tools/adl.types'
import * as modeltypes from './model.types'


class api_doc implements modeltypes.ApiJsDoc{
    get text():string{
        return this._text;
    }

    get tags():Map<string, string>{
        return this._tags;
    }

    constructor(private _text:string, private _tags: Map<string, string>){}
}

function jsdoci_to_apiDoc(docs: JSDoc[]): modeltypes.ApiJsDoc | undefined{
    if(docs == undefined) return undefined;
    let text: string =""
    let tags: Map<string, string> =  new Map<string, string>();
    for(const doc of docs){
       text = `${text}${doc.compilerNode.comment}`;

       for(const tag of doc.getTags())
          tags.set(tag.getTagName(), (tag.compilerNode.comment == undefined) ? "" : tag.compilerNode.comment);
    }
    if(text.length == 0  && tags.size == 0) return undefined;
    return  new api_doc(text, tags);
}

//makes a doc out input
export function makeApiModelDoc(input: TypeAliasDeclaration | ClassDeclaration | InterfaceDeclaration | PropertySignature | PropertyDeclaration,
                                options:modeltypes.apiProcessingOptions,
                                errors: adltypes.errorList ): modeltypes.ApiJsDoc | undefined{
  if(TypeGuards.isTypeAliasDeclaration(input))
    return jsdoci_to_apiDoc(input.getJsDocs());
/* if we ever wanted docs for stand alone types (not part of property decl)
  if(TypeGuards.isClassDeclaration(input))
    return jsdoci_to_apiDoc(input.getJsDocs());

  if(TypeGuards.isInterfaceDeclaration(input))
    return jsdoci_to_apiDoc(input.getJsDocs());
*/

  if(TypeGuards.isPropertySignature(input))
    return jsdoci_to_apiDoc(input.getJsDocs());

  if(TypeGuards.isPropertyDeclaration(input))
    return jsdoci_to_apiDoc(input.getJsDocs());

  return undefined;
}
