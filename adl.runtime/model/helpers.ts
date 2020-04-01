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
    const e = new adltypes.error;
    e.errorType         = ERROR_TYPE_API_LOAD;
    e.errorMessage = message;

    return e;
}
/////////////////////////////////////////////////
////////////////////////////////////////////////
export class typerEx{
    private _Ts:Array<Type> = Array<Type>();

    // returns the type in an Inheritance tree that matched
    // the requested s.
    private getSubClassOf(s:string, t: Type):Type | undefined{
        const baseTypes = t.getSymbolOrThrow().getDeclaredType().getBaseTypes(); //t.getBaseTypes();
        //console.log(`${EscapedName(t.getSymbolOrThrow().getDeclaredType())}  ${EscapedName(t)}==  ${baseTypes.length} ${t.getBaseTypes().length}`);
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
        } else {
                this._Ts.push(t);
        }
    }
    constructor(private t: Type){
        this.unpackIntersection(t, this._Ts);
        /*
        console.log(`${t.getText()} ** ${t.isIntersection()}`)
        if(t.isIntersection())
        {
            t.getIntersectionTypes().forEach(
                c   =>  {
                    this._Ts.push(c);
                });
            } else {
            this._Ts.push(t);
        }
        */
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
                                                            t.isNumber() ||
                                                            t.isArray();

                    // any uncomplex type is a non matcher
                    if(notComplex && !condition){
                        a.push(t);
                        return;
                    }

                    if(notComplex) return; // there is no point to check inhiritance tree
                                                                    // if it is a simple type

/*
                    if(t.isIntersection()){
                        const innerTyperEx = new typerEx(t);
                        const matches = innerTyperEx.MatchingInherits(s, condition);
                        if(matches.length > 0) a.push(t);// we push the type itself, not the sub type
                        return; // no need for more work
                    }
*/
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
