import { PropertySignature, PropertyDeclaration, Node, TypeGuards, TypeNode, Type } from 'ts-morph'

import * as adltypes from '@azure-tools/adl.types';
import * as modeltypes from './model.types';
import * as helpers from './helpers';


// allows the property loading logic to create an api type model
// without having to create reference to concerete types
type apiTypeModelCreator = (t: Type) => modeltypes.ApiTypeModel;


// represents a constraint
class property_constraint implements modeltypes.ConstraintModel{
	get Name(): string{
		return this.name;
	}

	get Arguments(): Array<any>{
		return this.args;
	}
	constructor(private name:string, private args: Array<any>){}
}

export class type_property{
	private _tp: helpers.typer;

	// cached objects.
	private _constraints: Array<modeltypes.ConstraintModel> | undefined;
	private _typeNode: TypeNode | undefined; // cached typeNode of the property data type (i.e the thing that is not a constraint)
	private _dataType_trueType: Type | undefined; // cached true type of property (after unpacking constraints, type aliases, intersections.)
	private _complexType: modeltypes.ApiTypeModel // cached complex type if DataTypeKind == Complex || ArrayComplex

	private get PropertyDataType_TypeNode(): TypeNode{
		if (this._typeNode != undefined) return this._typeNode;

		const nonConstraintsTypeNodes = this._tp.MatchIfNotInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
		this._typeNode = nonConstraintsTypeNodes[0]; // property load() ensures that we have only one in this list
		return this._typeNode as TypeNode;
	}

	private get PropertyDataType_TrueType(): Type{
		if(this._dataType_trueType != undefined) return this._dataType_trueType;

 	const t = this.PropertyDataType_TypeNode.getType();
		const true_t = helpers.getTrueType(t);
		this._dataType_trueType = true_t;
		return this._dataType_trueType as Type;
	}

	private isValidPropertyDataType():boolean{
		const true_t = this.PropertyDataType_TrueType;

		// TODO check typescript built in map, set, array types.. all are unallowed
		if(true_t.isString() || true_t.isNumber() || true_t.isClassOrInterface() || true_t.isIntersection()) return true;

		if(true_t.isArray()){
			const element_t = true_t.getArrayElementType();
			if(!element_t) return false; // unknown types
			if(!element_t.isString() && !element_t.isNumber() && !element_t.isClassOrInterface() && !element_t.isIntersection()) return false;
			if(element_t.isAny()) return false; // that we can not work with!

			return true;
		}

		return false;
	}

	get Name(): string{
		return this.p.getName();
	}

	get DataTypeName():string{
		if(!this.isArray()) return  this.PropertyDataType_TrueType.getText();

			const true_t = this.PropertyDataType_TrueType;
			const element_t = true_t.getArrayElementType() as Type;
			const element_t_true = helpers.getTrueType(element_t);
			return element_t_true.getText();
	}

	// only valid for properties that are either `complex` of `array of complex`
	// if model to be serialized this needs to return undefined.
	get ComplexDataType(): modeltypes.ApiTypeModel{
		if(this.DataTypeKind != modeltypes.PropertyDataTypeKind.Complex && this.DataTypeKind != modeltypes.PropertyDataTypeKind.ComplexArray)
				throw new Error("propery ${this.Name} data type is not complex or array of complex");

			return this._complexType;
	}

	get isRemoved():boolean{
			return this.hasConstraint(adltypes.CONSTRAINT_NAME_REMOVED);
	}

	get isManaullyConverted(): boolean{
		return this.hasConstraint(adltypes.CONSTRAINT_NAME_NOAUTOCONVERSION);
	}

	get DataTypeKind(): modeltypes.PropertyDataTypeKind{
		const true_t = this.PropertyDataType_TrueType;

		if(true_t.isString() || true_t.isNumber()) return modeltypes.PropertyDataTypeKind.Scalar;
		if(true_t.isArray()){
				const element_t = true_t.getArrayElementType() as Type;
				const element_t_true = helpers.getTrueType(element_t);

				if(element_t_true.isString() || element_t_true.isNumber()) return modeltypes.PropertyDataTypeKind.ScalarArray;
					return modeltypes.PropertyDataTypeKind.ComplexArray;
		}

		return modeltypes.PropertyDataTypeKind.Complex
	}

	// returns all the constraints assigned to this property
	get Constraints(): Array<modeltypes.ConstraintModel>{
		// cached?
		if(this._constraints != undefined)
			return this._constraints as Array<modeltypes.ConstraintModel>;

		const constraints = new  Array<modeltypes.ConstraintModel>();
		const constraintsTypeNodes = this._tp.MatchIfInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
		for(let t of constraintsTypeNodes){
			const tt = t.getType()
			const name = tt.compilerType.symbol.escapedName.toString();
			const args = new Array<any>();
			// get args
			tt.getTypeArguments().forEach(arg => args.push(helpers.quotelessString( arg.getText())));
			const c = new property_constraint(name, args);

			// add it
			constraints.push(c);
		}
		// cache
		this._constraints = constraints;

		return this._constraints as Array<modeltypes.ConstraintModel>;
	}

	// constraints on Array elements (if applicable)
	get ArrayElementConstraints(): Array<modeltypes.ConstraintModel>{
		if(!this.isArray())
				return new Array<modeltypes.ConstraintModel>();

		// TODO cache this
		const true_t = this.PropertyDataType_TrueType; // this is actual datatype of property Prop:string & whatever[] => string & whatever[]
		const element_t = true_t.getArrayElementType() as Type; // => string& whatever;
		const typer = new helpers.typerEx(element_t);

		const constraints = new  Array<modeltypes.ConstraintModel>();
		const constraintTypes = typer.MatchingInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT, true);
		for(let t of constraintTypes){
			const name = t.compilerType.symbol.escapedName.toString();
			const args = new Array<any>();
			// get args
			t.getTypeArguments().forEach(arg => args.push(arg.getText()));
			const c = new property_constraint(name, args);

			// add it
			constraints.push(c);
		}

		return constraints;
	}


	get isOptional(): boolean{
		return this.p.getQuestionTokenNode() != undefined;
	}

	constructor(private p: PropertySignature | PropertyDeclaration, private _apiTypeModelCreator: apiTypeModelCreator){}

	// returns constraints filtered to "defaulting"
	// TODO: cache all types of get*Constraints()
	private getConstraintsByType(constraintType: string): Array<modeltypes.ConstraintModel>{
			const constraints = new  Array<modeltypes.ConstraintModel>();
		const constraintsTypeNodes = this._tp.MatchIfInherits(constraintType);
		for(let t of constraintsTypeNodes){
			const tt = t.getType()
			const name = tt.compilerType.symbol.escapedName.toString();
			const args = new Array<any>();
			// get args
			tt.getTypeArguments().forEach(arg => args.push(helpers.quotelessString(arg.getText())));
		const c = new property_constraint(name, args);

			// add it
		constraints.push(c);
		}
		return constraints

	}

	getDefaultingConstraints(): Array<modeltypes.ConstraintModel>{
		return this.getConstraintsByType(adltypes.INTERFACE_NAME_DEFAULTINGCONSTRAINT);
	}

	getValidationConstraints(): Array<modeltypes.ConstraintModel>{
		return this.getConstraintsByType(adltypes.INTERFACE_NAME_VALIDATIONCONSTRAINT);
	}

	getConversionConstraints(): Array<modeltypes.ConstraintModel>{
		return this.getConstraintsByType(adltypes.INTERFACE_NAME_CONVERSIONCONSTRAINT);
	}

	// constraints on Array elements (if applicable)
	getArrayElementValidationConstraints(): Array<modeltypes.ConstraintModel>{
		if(!this.isArray())
				return new Array<modeltypes.ConstraintModel>();

		// TODO cache this
		const true_t = this.PropertyDataType_TrueType; // this is actual datatype of property Prop:string & whatever[] => string & whatever[]
		const element_t = true_t.getArrayElementType() as Type; // => string& whatever;
		const typer = new helpers.typerEx(element_t);

		const constraints = new  Array<modeltypes.ConstraintModel>();
		const constraintTypes = typer.MatchingInherits(adltypes.INTERFACE_NAME_VALIDATIONCONSTRAINT, true);
		for(let t of constraintTypes){
			const name = t.compilerType.symbol.escapedName.toString();
			const args = new Array<any>();
			// get args
			t.getTypeArguments().forEach(arg => args.push(arg.getText()));
			const c = new property_constraint(name, args);

			// add it
			constraints.push(c);
		}

		return constraints;
	}

	// short cut to identify if property is array
	isArray(): boolean{
		return this.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray ||
									this.DataTypeKind == modeltypes.PropertyDataTypeKind.ScalarArray;
	}

	hasConstraint(constraintName:string): boolean{
		const constraints = this.Constraints;
		return (constraints.filter(c =>  c.Name == constraintName).length != 0)
	}

	load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
		const typeNode = this.p.getTypeNode();
		if(!typeNode){
			const message = `property ${this.Name} failed to load, failed to get TypeNode`;
			options.logger.err(message);
			errors.push(helpers.createLoadError(message));
			return false;
		}

		this._tp = new helpers.typer(typeNode);

		// weather or not the property defined as an intersection, we need to make
		// sure that only ONE type is the data type, the rest are constraints
		// fancy_property: string & Required (OK)
		// fancy_property: string & int & Required (NOT OK: data type is intersecting)
		// fancy_property: Required & MustMatch<..> (NOT OK: there is no data type)
		// TODO check for union types
		const nonConstraintsTypeNodes = this._tp.MatchIfNotInherits("PropertyConstraint");
		if(nonConstraintsTypeNodes.length != 1){
			// let us assume that it was not defined
			let message = `invalid data type for property ${this.Name}. must have a data type defined`;

			if(nonConstraintsTypeNodes.length == 1)
					message = `invalid data type for property ${this.Name}. must have a single data type`;

			options.logger.err(message);
			errors.push(helpers.createLoadError(message));
			return false;
		}

		if(!this.isValidPropertyDataType()){
			const message = `invalid data type for property ${this.Name} allowed properties are string, number, intersections, class, interface and standard js arrays`
			options.logger.err(message);
			errors.push(helpers.createLoadError(message));
			return false;
		}

		// is data type is a complex type..  something that we can cache? if so let us cache it
		if(this.DataTypeKind != modeltypes.PropertyDataTypeKind.Complex && this.DataTypeKind != modeltypes.PropertyDataTypeKind.ComplexArray)
					return true;

		const true_t = this.PropertyDataType_TrueType;
		// go for either the type or the type of array element
		const apiTypeModel =
			this._apiTypeModelCreator(this.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex ? true_t : true_t.getArrayElementType() as Type);

		const loaded = apiTypeModel.load(options, errors);
		if(loaded)
			this._complexType = apiTypeModel;

		return loaded;
	}
}
