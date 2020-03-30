import { ClassDeclaration, InterfaceDeclaration, PropertySignature, PropertyDeclaration, Node, TypeGuards, TypeNode, Type } from 'ts-morph'

import * as adltypes from '@azure-tools/adl.types';
import * as modeltypes from './model.types';
import * as helpers from './helpers';


// allows the property loading logic to create an api type model
// without having to create reference to concerete types
type apiTypeModelCreator = (t: Type) => modeltypes.ApiTypeModel;
// given a declaration and a type. it finds if "name" is defined as an argument and gets the actual type of aname
// example:
// declaration: Person<T>{Address:T}
// type:Person<string>
// Find the actual value of T
function getTypeArgumentType(parentDeclaration:ClassDeclaration | InterfaceDeclaration, usedT: Type, name:string): Type | undefined{
    let index = -1;
    let current = 0;
    // check in declaration, to get the index
    for(const tp of parentDeclaration.getTypeParameters()){
        if(tp.getName() == name){
            index = current;
            break;
        }
        current++;
    }
    if(index == -1) return undefined;
    let t: Type | undefined = undefined;
    current = 0;
    for(const ta of usedT.getTypeArguments()){
        if(current == index){
            t = ta;
            break;
        }
        current ++;
    }
    return t;
}

// unpacks a type until it reaches a type that is:
// not an intersecting
// not an adl constraint
// it follows type args example
// class X<T>{
// prop:T
//}
// it will follow the T
// it assumes that max of one non constraint exists
function getPropertyTrueType(containerDeclaration:ClassDeclaration | InterfaceDeclaration, containerType: Type, tt: Type): Type{
    let actual = tt; // assume it is a regular type
    // find it as type argument of the parent declaration
    const fromTypeArg = getTypeArgumentType(containerDeclaration, containerType, tt.getText());
    if(fromTypeArg){// this type is from a Type argument. use the type in type argument
        actual = fromTypeArg;
     }

    if(actual.isIntersection()){ // drill deeper
        const typer = new helpers.typerEx(actual);
        const nonConstraintTypes = typer.MatchingInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT, false);
        return getPropertyTrueType(containerDeclaration, containerType, nonConstraintTypes[0]);
    }

    return actual;
}


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
    private _tpEx : helpers.typerEx;
    // cached objects.
    private _constraints: Array<modeltypes.ConstraintModel> | undefined;
    private _dataType_trueType: Type | undefined; // cached true type of property (after unpacking constraints, type aliases, intersections.)
    private _complexType: modeltypes.ApiTypeModel // cached complex type if DataTypeKind == Complex || ArrayComplex

    private get PropertyDataType_TrueType(): Type{
        if(this._dataType_trueType != undefined) return this._dataType_trueType;
        const nonConstraintsTypes = this._tpEx.MatchIfNotInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
        const t = nonConstraintsTypes[0]; // property load() ensures that we have only one in this list

        const true_t = getPropertyTrueType(this.containerDeclaration, this.containerType, t);
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
        if(this.DataTypeKind == modeltypes.PropertyDataTypeKind.Scalar)
            return this.PropertyDataType_TrueType.getText();

        if(this.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex)
            return helpers.EscapedName(this.PropertyDataType_TrueType);

        if(this.isArray()){
            const true_t = this.PropertyDataType_TrueType;
            const element_t = true_t.getArrayElementType() as Type;
            const element_t_true = getPropertyTrueType(this.containerDeclaration, this.containerType, element_t);

            if(this.DataTypeKind == modeltypes.PropertyDataTypeKind.ScalarArray)
                return element_t_true.getText();
            else
                return helpers.EscapedName(element_t_true);
        }
        throw new Error("unable to get data type name");
    }

    get isEnum(): boolean{
        const enumConstraints = this.getConstraintsByType(adltypes.INTERFACE_NAME_ONEOF);
        return (enumConstraints.length != 0);
    }
    get EnumValues(): any[]{
        const vals: any[] = [];
        if(!this.isEnum) return vals;

        const enumConstraints = this.getConstraintsByType(adltypes.INTERFACE_NAME_ONEOF);
        // would be nice if we can allow arrays . so user can do [v1...values], [v2.. values]
        return enumConstraints[0].Arguments[0]; // must be one because we pre validate
    }

    get isAliasDataType(): boolean{
        const dataTypes =  this.getConstraintsByType(adltypes.INTERFACE_NAME_DATATYPE);
        return dataTypes.length == 1; // must have one, we validate against that
    }

    get AliasDataTypeName(): string{
        if(!this.isAliasDataType) return this.DataTypeName;
        const dataTypes =  this.getConstraintsByType(adltypes.INTERFACE_NAME_DATATYPE);

        const c = dataTypes[0]; // first and only constraint
        return c.Arguments[0];
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
                const element_t_true = getPropertyTrueType(this.containerDeclaration, this.containerType, element_t);

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
        const constraintsTypes = this._tpEx.MatchIfInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
        for(let tt of constraintsTypes){
            const name = helpers.EscapedName(tt);
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
            console.log(t.getText())
            const name = helpers.EscapedName(t);
            console.log(t.getText())

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

    constructor(private containerType: Type,
                private containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                private p: PropertySignature | PropertyDeclaration,
                private _apiTypeModelCreator: apiTypeModelCreator){
    }

    // returns constraints filtered to "defaulting"
    // TODO: cache all types of get*Constraints()
    private getConstraintsByType(constraintType: string): Array<modeltypes.ConstraintModel>{
        const constraints = new  Array<modeltypes.ConstraintModel>();
        const constraintsTypes = this._tpEx.MatchIfInherits(constraintType);
        for(let tt of constraintsTypes){
            const name = helpers.EscapedName(tt);
            const args = new Array<any>();
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
            const name = helpers.EscapedName(t);
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
        const t = typeNode.getType()
        this._tpEx = new helpers.typerEx(t);

        // weather or not the property defined as an intersection, we need to make
        // sure that only ONE type is the data type, the rest are constraints
        // fancy_property: string & Required (OK)
        // fancy_property: string & int & Required (NOT OK: data type is intersecting)
        // fancy_property: Required & MustMatch<..> (NOT OK: there is no data type)
        // TODO check for union types
        const nonConstraintsTypeNodes = this._tpEx.MatchIfNotInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
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

        // must have max of one adl.DataType
        const dataTypes = this.getConstraintsByType(adltypes.INTERFACE_NAME_DATATYPE);
        if(dataTypes.length > 1){
            const message = `invalid data type for property ${this.Name} multiple adl.DataType defined on property`
            options.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return false;
        }

        const enumConstraints = this.getConstraintsByType(adltypes.INTERFACE_NAME_DATATYPE);
        if(dataTypes.length > 1){
            const message = `invalid data type for property ${this.Name} multiple adl.OneOf defined on property`
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
