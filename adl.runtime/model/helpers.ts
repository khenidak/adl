import { Node, TypeNode, TypeGuards, TypeReferenceNode, Type, TypeAliasDeclaration, Symbol} from 'ts-morph';

import * as adltypes from '@azure-tools/adl.types'

export const ERROR_TYPE_API_LOAD = "api-load";

export const defaults = {
  tsconfig: <any>{
    // pick up the configuraton from the adl.types package.
    extends: './node_modules/@azure-tools/adl.types/config.json',
    // all *.adl.ts files
    include: [
      '**/*.adl.ts'
    ],
  },

  package: <any>{
    name: 'APINAME',
    version: '1.0.0',
    description: 'DESCRIPTION',
    main: 'MAIN.adl.ts',
    devDependencies: {
      'typescript': '~3.7.4',
      '@azure-tools/adl.types': '~1.0.0'
    }
  }
};

// compiler expands boolean types to true & x | false & x
// if the type is an intersection. this is a helper function that works around that
// !!!! as we introduce union types, we need to revisit this
export function isBoolean(t: Type):boolean{
    const isBool = false;
    if(t.isUnion){
        const unionTypes = t.getUnionTypes();
        for(const u of unionTypes){
            if(u.isIntersection()){
                const intersectTypes = u.getIntersectionTypes()
                for(const i of intersectTypes){
                    return isBool || isBoolean(i);
                }
            }else{
                return isBool || isBoolean(u);
          }
        }
    }

    return isBool || t.isBoolean() ||  t.isBooleanLiteral();
}
// quotelessString removes " and ' from string
export function quotelessString(inString: string): string{
    //TODO: modify to regexp for before and after string
    return inString.replace(/'/g, "").replace(/"/g, '');
}

export function EscapedName(tt:Type): string{
    const s = tt.getSymbol();
    if(s) return s.getName();

    // has no symbol (premitive type)
    return tt.getText();
}

// helper used for model load errors
export function createLoadError(message:string): adltypes.error{
    const e        = new adltypes.error;
    e.errorType    = ERROR_TYPE_API_LOAD;
    e.errorMessage = message;

    return e;
}
/////////////////////////////////////////////////
///////////////////////////////////////////////
/* What is typer?
 * typer is a utlity class that allow us to process various complixiest in a simple way
 * for eample it allow us to unpack x & y & z (where z is a & b & c)
 * it helps finding declarations based on what they inhirit inthe above declartion
 * so if c was defined as c implements someinterface (or c extends someinterface).
 * and we want to find any declaration that has someinterface as a baseclass/basetype
 * typer will be your best friend.
 *
 * or if you want to find all declaration that does not inhirit from somebase class
 * then typer is also your best friend.each model in our models hang to a single typer
 * except property where things are a bit more complex for example
 *
 * property: scalar type => one typer
 *
 * property: complex type=> one typer
 *
 * property: array => two typers one for the array as a whole and one for
 * element definition that allow us to do something like `property: string & MustMatch<xxx>[]`
 *
 * property: map => 3 typers
 * one for the map itself
 * one for the key definition
 * one for the value definition
 * that allow us to define a propoerty like this
 * property: Map<string & MaxLength<10>, string & MaxLength<20> & MustMatch<xxx>> & MaxLength<50>
 * the above validates the map as
 * max keys 50
 * max length of each key is 10
 * max length of each value is 20 and each value needs to match an arbitrary regexp
 */
export class typerEx{
    private _Ts:Array<Type> = Array<Type>();

    // returns the type in an Inheritance tree that matched
    // the requested s.
    private getSubClassOf(s:string, t: Type):Type | undefined{
        const baseTypes = t.getSymbolOrThrow().getDeclaredType().getBaseTypes(); //t.getBaseTypes();
        for(let tt of baseTypes){
            if(EscapedName(tt) == s || this.getSubClassOf(s, tt) != undefined){
                return tt as Type;
            }
        }

        return undefined;
    }
    private unpackIntersection(t: Type, bag: Array<Type>): void{
        if(t.isIntersection())
        {
            const intresect = t.getIntersectionTypes();
            for(const  c of intresect){
                this.unpackIntersection(c, bag);
            }
            return;
        }
        // this is a bool that has some constraints on it
        // as in defined as boolean & something
        // which means compiler will translate it to true & something | false & something;
        if(t.isUnion() && isBoolean(t)){
            // for this we need to just pick one
            const unionTypes = t.getUnionTypes();
            this.unpackIntersection(unionTypes[0], bag)
            return;
        }
        this._Ts.push(t);
    }
    constructor(private t: Type){
        // we unpack the entire repsentation
        // example a & b & c where c might be defined as c1 & c2 where c2 is defined as c21 & c22
        // into
        // a, b,c , c1, c21, c22
        this.unpackIntersection(t, this._Ts);
    }

    /* this is a terrible naming and needs to change */
    MatchIfInheritsSingle(s:string): Type | undefined{
        const match =  this.MatchIfInherits(s);
        if(match.length != 1) return undefined;

        return match[0];
    }

    MatchIfInherits(s:string): Array<Type>{
        return this.MatchingInherits(s, true);
    }

    MatchIfNotInherits(s:string): Array<Type>{
        return this.MatchingInherits(s, false);
    }

    MatchingInherits(s:string, condition: boolean): Array<Type>{
        const a = new Array<Type>();
        this._Ts.forEach(
                t => {
                    const notComplex = t.isString()  ||
                                       t.isNumber()  ||
                                       isBoolean(t) ||
                                       t.isArray();

                    // any uncomplex type is a non matcher
                    if(notComplex && !condition){
                        a.push(t);
                        return;
                    }

                    if(notComplex) return; // there is no point to check inhiritance tree
                                                                    // if it is a simple type

                    // if the sub class matches, return it
                    if(EscapedName(t) == s){
                        a.push(t);
                        return;
                    }

                    // no look in super(s)
                    // if it is a complex type then look for it is inhiritance tree
                    if( (this.getSubClassOf(s, t) != undefined)  == condition){
                        a.push(t);
                    }
        });
        return a
    }
}
