import { TypeNode, TypeGuards, TypeReferenceNode, Type, TypeAliasDeclaration} from 'ts-morph';

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
	return tt.compilerType.symbol.escapedName.toString()
}

// unpacks a type until it reaches a type that is:
// not an intersecting
// not an adl permitive
// it assumes that max of one non constraint exists
export function getTrueType(tt: Type): Type{
	if(tt.isIntersection()){
		const typer_ex = new typerEx(tt);
		const nonConstraintTypes = typer_ex.MatchingInherits("PropertyConstraint", false);
		return getTrueType(nonConstraintTypes[0]);
	}

	return tt;
}

export class typer{
	// Ts are the A and B and C of A & B & C
	private _Ts:Array<TypeNode> = Array<TypeNode>();
	private getSubClassOfType(s:string, t: Type):Type | undefined{
		const baseTypes = t.getBaseTypes();
		//console.log(`+++ ${t.getText()}/ ${t} count of base: ${ baseTypes.length  }`);

		for(let tt of baseTypes){
			if(EscapedName(tt) == s || this.getSubClassOfType(s, tt) != undefined)
						return tt as Type;
		}

		return undefined;
	}

	private getSubClassOf(s:string, t: TypeNode):Type | undefined{
		const ref = (t as TypeReferenceNode);

		const baseTypes = ref.getTypeName().getType().getBaseTypes();

		//console.log('+')

		//console.log(`${ref.getText()} ${ref.getTypeName().getType().isInterface()}`);
		//ref.getTypeName().forEachChild(c => console.log(`${c.getType().getText()} ${c.getType().isInterface()}  `));
		//console.log(`${ref.getText()} ${ref.getTypeName().}`);
		// console.log('-')

		//console.log(`+++ ${t.getText()}/${t.getType().getText()}/ ${t.getKindName()} base: ${baseTypes.length}`);

		for(let tt of baseTypes){
			if(EscapedName(tt) == s || this.getSubClassOfType(s, tt) != undefined)
						return tt as Type;
		}

		return undefined;
	}

	constructor(private t: TypeNode){
		//console.log(`typer processing: ${t.getText()}`)
		if(TypeGuards.isIntersectionTypeNode(t))
		{
			//console.log(`typer  ${t.getText()} is an intersection`)
			t.getTypeNodes().forEach(
				c	=>	{
				//	console.log(c.getText())
					this._Ts.push(c);
				});
			} else {
			//console.log(t.getText())
			//console.log(`typer  ${t.getText()} is NOT an intersection`)
			this._Ts.push(t);
		}
	}


	// returns the first type node
	First(): TypeNode{
		return this._Ts[0];
	}

	All(): Array<TypeNode>{
		// TODO: copy
		return this._Ts;
	}

	// walks a declaration (along base clases)
	// and find a match.
	MatchInGraph(s:string): Array<Type>{
		const a = new Array<Type>();
		this._Ts.forEach(
			t => {
				const ref = (t as TypeReferenceNode);
				// the current type match
				if(ref.getTypeName().getText().indexOf(s) != -1){
					a.push(t.getType());
					return;
				}
				// does current inhirit from one we can match to?
				const matched = this.getSubClassOf(s, t);
				if(matched) a.push(matched);
			});
		return a;
	}


	// given a thing "x" do i have anything in my
	// typer that inhirits from x?
	MatchIfInherits(s: string): Array<TypeNode>{
		return this.MatchingInherits(s, true);
	}

	MatchIfNotInherits(s:string): Array<TypeNode>{
		return this.MatchingInherits(s, false);
	}

	private MatchingInherits(s:string, condition: boolean): Array<TypeNode>{
		const a = new Array<TypeNode>();
		this._Ts.forEach(
				t => {
					const notComplex = t.getKindName() == "StringKeyword" ||
															t.getKindName() == "ArrayType" ||
															t.getKindName() == "NumberKeyword";

					// any uncomplex type is a non matcher
					if(notComplex && !condition){
						a.push(t);
						return;
					}

					if(notComplex) return; // there is no point to check inhiritance tree
																	// if it is a simple type

					const ref = t as TypeReferenceNode;
					if(ref.getTypeName().getType().isIntersection()){
						const innerTyper = new typerEx(ref.getTypeName().getType());
						const matches = innerTyper.MatchingInherits(s, condition);
						if(matches.length > 0) a.push(t);// we push the type itself, not the sub type
						return; // no need for more work
					}

					// if it is a complex type then look for it is inhiritance tree
					if( (this.getSubClassOf(s, t) != undefined)  == condition){
						a.push(t);
					}
		});
		return a
	}

	MatchInGraphSingle(s:string):Type | undefined{
		const a = this.MatchInGraph(s);
		if(a.length != 1) return undefined;
		return a[0];
	}

	// return matching types
	// !!!!!! IMPORTANT !!!!!!
	// TODO HERE MATCH BY NAME, WE NEED
	// TO MATCH:
	// NAME: exact match
	// TYPE: (interface and or  CLASS)
	// in an inheritance tree. e,g ARM type => customized api type.
	// example: core runtime works on customizedApiType even when the type is declared
	// as ARMCustomizedResource or whatever. That way core runtime will always work. and extended
	// runtime will work.
	Match(s: string): Array<TypeNode>{
		var a = new Array<TypeNode>();
		this._Ts.forEach(t =>
		{
			//console.log(`++ ${t.getKindName()} ${t.getText()}`)
				// getsymbol().fullyqualifedName
			if(t.getText().indexOf(s) > -1)
					a.push(t);
		});

		return a;
	}

	// returns one match or bust
	MatchSingle(s: string):TypeNode | undefined{
		var a = this.Match(s);

		if(a.length != 1) return undefined;

		return a[0];
	}
}

export function createLoadError(message:string): adltypes.error{
	const e = new adltypes.error;
	e.errorType			= ERROR_TYPE_API_LOAD;
	e.errorMessage = message;

	return e;
}

export class typerEx{
	private _Ts:Array<Type> = Array<Type>();
	constructor(private t: Type){
			//console.log(`typer processing: ${t.getText()}`)
		if(t.isIntersection())
		{
			//console.log(`typerEX  ${t.getText()} is an intersection`)
			t.getIntersectionTypes().forEach(
				c	=>	{
					//console.log(c.getText())
					this._Ts.push(c);
				});
			} else {
			//console.log(t.getText())
			//console.log(`typerEX  ${t.getText()} is NOT an intersection`)
			this._Ts.push(t);
		}
	}

	private getSubClassOf(s:string, t: Type):Type | undefined{
		const baseTypes = t.getBaseTypes();
		for(let tt of baseTypes){
			if(EscapedName(tt) == s || this.getSubClassOf(s, tt) != undefined){
				return tt as Type;
			}
		}

		return undefined;
	}

		MatchingInherits(s:string, condition: boolean): Array<Type>{
		const a = new Array<Type>();
		this._Ts.forEach(
				t => {
					//console.log(`*** ${t.getText()}`);
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

					if(t.isIntersection()){
						const innerTyperEx = new typerEx(t);
						const matches = innerTyperEx.MatchingInherits(s, condition);
						if(matches.length > 0) a.push(t);// we push the type itself, not the sub type
						return; // no need for more work
					}

					// if it is a complex type then look for it is inhiritance tree
					if( (this.getSubClassOf(s, t) != undefined)  == condition){
						a.push(t);
					}
		});
		return a
	}
}
