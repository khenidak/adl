import { TypeAliasDeclaration, ClassDeclaration, InterfaceDeclaration, TypeReferenceNode, TypeGuards, Node, Type,TypeNode } from 'ts-morph';


import * as adltypes from '@azure-tools/adl.types';
import * as modeltypes from './model.types';
import * as helpers from './helpers'

import { type_property } from './apiTypeProperty'

// passed down to properties when the property data type is a complex type or array of complex type
function createApiTypeModel(t: Type): modeltypes.ApiTypeModel{
	return new api_type(t);
}

// represents a constraint
export class apitype_constraint implements modeltypes.ConstraintModel{
	get Name(): string{
		return this.name;
	}

	get Arguments(): Array<any>{
		return this.args;
	}
	constructor(private name:string, private args: Array<any>){}
}

//TODO: loading logic can be improved by moving as much as we can to base class
//api_type implements the common api type behaviors. And
// is used in the following ways:
// 1. super for versioned and normalized type
// 2. represents nested types. forexample a parent type versioned type
// might be Person.person may have Address(s). each is represented by
// ap_type.
export class api_type implements modeltypes.ApiTypeModel{
	private _properties = new Map<string, modeltypes.ApiTypePropertyModel>();
	private _constraints: Array<modeltypes.ConstraintModel> | undefined = undefined;
	protected _name:string;

	get Name():string{return this._name;}

	get Properties(): Iterable<modeltypes.ApiTypePropertyModel> {
		var infos = new Array<modeltypes.ApiTypePropertyModel>();

		for(let [k,v] of this._properties)
			infos.push(v);

		return infos;
	}

	get Constraints(): Array<modeltypes.ConstraintModel>{
		if(this._t == undefined) return new Array<modeltypes.ConstraintModel>(); // can not work if this is not loaded
		if(this._constraints != undefined) return this._constraints;

		const typer = new helpers.typerEx(this._t);
		this._constraints = new  Array<modeltypes.ConstraintModel>();
		const constraintsTypes = typer.MatchingInherits(adltypes.INTERFACE_NAME_APITYPECONSTRAINT, true);
		for(let t of constraintsTypes){
			const name = helpers.EscapedName(t);
			const args = new Array<any>();
			// get args
			t.getTypeArguments().forEach(arg => args.push(helpers.quotelessString( arg.getText())));
			const c = new apitype_constraint(name, args);

			// add it
			this._constraints.push(c);
		}
		return this._constraints as Array<modeltypes.ConstraintModel>;
	}

	getProperty(name: string): modeltypes.ApiTypePropertyModel | undefined{
		return this._properties.get(name);
	}

	constructor(private _t: Type | undefined){

	}

	load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
		if(!this._t)
			throw new Error(`api_type was not loaded with a type to parse`);
		// set the name
		this._name = helpers.EscapedName(this._t)
	// set the property
		const loaded = this.addPropertiesFor(options, errors, this._t);
		return loaded;
	}

	protected addPropertiesFor(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList,t: Type): boolean{
		// process base types first
		const baseTypes = t.getBaseTypes();
		if(baseTypes.length > 0){
			// add properties from base classes
			let result = true;
			for(let base of baseTypes){
				const r = this.addPropertiesFor(options, errors, base);
				if(!r) return r;
			}
		}


		// convert node to type
		var decl: ClassDeclaration | InterfaceDeclaration | undefined = undefined;

		const s = t.getSymbol();
		if(!s){ // This will only happen if the symbol is in different package (which we don't support)
			const message = `failed to get properties for ${t.getText()} failed to get symbol`;
			options.logger.err(message);
			errors.push(helpers.createLoadError(message));
			return false;
		}

		if(t.isInterface()) decl = (s.getDeclarations()[0] as InterfaceDeclaration);
		if(t.isClass()) decl = (s.getDeclarations()[0] as ClassDeclaration);

		if(!decl){
			const message = `failed to load property ${t.getText()}. it is not an interface or a class`;
			options.logger.err(message);
			errors.push(helpers.createLoadError(message));
			return false;
		}

		const props = decl.getProperties();
		for(let p of props)
		{
			// add property object for each
			const prop = new type_property(p, createApiTypeModel);
			const loaded = prop.load(options, errors);
			if (!loaded) {
				const message = `failed to load property ${p.getText()}, check errors`;
				options.logger.err(message);
				return false;
			}
				this._properties.set(prop.Name, prop);
		}
		return true;
	}
}

export class normalized_type extends api_type implements modeltypes.NormalizedApiTypeModel{
	get NormalizerName():string{
		// name
		const armResource = this.tp.MatchSingle("CustomNormalizedApiType");
		if(!armResource) return "";

		const ta = (armResource as TypeReferenceNode).getTypeArguments();
		if (ta.length  < 3) return adltypes.AUTO_NORMALIZER_NAME;

		// todo: this is not be the cleanest way to do that.
		const normalizerName = helpers.quotelessString(ta[2].getText()).replace(/\s/g, '');
		const auto_normalizer_name = `${adltypes.AUTO_NORMALIZER_NAME}<${helpers.quotelessString(ta[1].getText())}>`

		if(normalizerName.indexOf(auto_normalizer_name) != -1)
			return adltypes.AUTO_NORMALIZER_NAME;

		return normalizerName;
	}

	constructor( private tad:TypeAliasDeclaration, private tp: helpers.typer, private apiModel: modeltypes.ApiModel){
		super(tad.getType());

	}

	load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
		const typeDef = this.tp.MatchInGraphSingle("CustomNormalizedApiType");
		if(!typeDef){
				const message = `failed to load normalized api type ${this.tad.getText()}. can not find CustomNormalizedApiType`;
				options.logger.err(message);
				errors.push(helpers.createLoadError(message));
				return false;
		}

		const props = typeDef.getTypeArguments()[1];
			if( !props.isInterface() && !props.isClass()){
				const message = ` unable to identify properties type for NormalizedApiType ${props.getText()} allowed property types are class and interface`;
				options.logger.err(message);
				errors.push(helpers.createLoadError(message));
				return false;
		}

		//set name
		const name_ta = typeDef.getTypeArguments()[0];
		this._name = helpers.quotelessString(name_ta.getText());

		// add properties
		return this.addPropertiesFor(options, errors, props);
	}
}


// versioned_type models a user provided versioned type.
export class versioned_type extends api_type implements modeltypes.VersionedApiTypeModel {
// TODO replace MatchSingle
	get DisplayName(): string{
		const armResource = this.tp.MatchSingle("ArmResource");
		if(!armResource) return "";

		const ta = (armResource as TypeReferenceNode).getTypeArguments();
		if (ta.length == 2) return "";

		return ta[1].getText();
	}

	get NormalizedApiTypeName():string{
		// name
		const armResource = this.tp.MatchSingle("ArmResource");
		if(!armResource) return "";

		const ta = (armResource as TypeReferenceNode).getTypeArguments();
		if (ta.length  < 3) return "";

		return helpers.quotelessString(ta[0].getText());
	}

	get VersionerName(): string{
		const armResource = this.tp.MatchSingle("ArmResource");

		const ta = (armResource as TypeReferenceNode).getTypeArguments();
		//TODO !!!! IMPORTANT ONCE WE SOLVE THE GET BASE CLASS TYPE ARGS
		// THIS WILL NEED TO BE REPLACED
		if(ta.length < 5) return adltypes.AUTO_VERSIONER_NAME;
		return helpers.quotelessString(ta[4].getText());
	}

	constructor(private tad:TypeAliasDeclaration, private tp: helpers.typer, private apiModel: modeltypes.ApiModel){
		super((tad.getTypeNode() as TypeNode).getType());
		//const x = tad.getTypeNode() as TypeNode;
		//console.log(`${x.getText()} ${x.getType().getText()} ${x.getType().isIntersection()}`)
	}

	getVersionedTypeName(): string{
			// name
		var armResource = this.tp.MatchSingle("ArmResource");
		if(!armResource) return "";

		var ta = (armResource as TypeReferenceNode).getTypeArguments();
		if (ta.length  < 4) return "";

		return ta[3].getText();
	}

	load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
		// name
		var armResource = this.tp.MatchSingle("ArmResource");
		if(!armResource) return false;


		const ta = (armResource as TypeReferenceNode).getTypeArguments();
		// set name
		this._name =  helpers.quotelessString(ta[1].getText());

		// TODO: remove length check because they are checked as TS files are compiled
		if (ta.length  < 4){
				const message = `failed to load versioned api type ${this.Name}. expected at least 4 type arguments`;
				options.logger.err(message);
				errors.push(helpers.createLoadError(message));
				return false;
		}

		const propsTypeNode = ta[3];
		const typeProps = propsTypeNode.getType();
		if( !typeProps.isInterface() && !typeProps.isClass() /* && !TypeGuards.isIntersectionTypeNode(typeProps) -- no love for intersection or union*/){
				const message =`unable to identify properties type for ${this.Name} allowed Kinds are: Interface or Interface`;
				options.logger.err(message);
				errors.push(helpers.createLoadError(message));
				return false;
			}

		if(!this.apiModel.hasNormalizedApiType(this.NormalizedApiTypeName)){
			const message =`VersionedApiType:${this.Name} uses a normalized type ${this.NormalizedApiTypeName} that does not exist`;
			options.logger.err(message);
			errors.push(helpers.createLoadError(message));
			return false;
		}

		// add properties
		return this.addPropertiesFor(options, errors, typeProps);
	}
}
