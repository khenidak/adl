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

function getTrueType(tt: Type): Type{
    if(tt.isIntersection()){ // drill deeper
        const typer = new helpers.typerEx(tt);
        const nonConstraintTypes = typer.MatchingInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT, false);
        return getTrueType(nonConstraintTypes[0]);
    }

    return tt;
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

    // if it is complex type then  PropertyDataType_TrueType = type of complex type
    // if it is array then true data type will point to type of array element
    // Map is treated as special case, and should be merged in the same logic (TODO)
    private get PropertyDataType_TrueType(): Type{
        if(this._dataType_trueType != undefined) return this._dataType_trueType;
        const nonConstraintsTypes = this._tpEx.MatchIfNotInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
        const t = nonConstraintsTypes[0]; // property load() ensures that we have only one in this list

        const true_t = getPropertyTrueType(this.containerDeclaration, this.containerType, t);
        this._dataType_trueType = true_t;
        return this._dataType_trueType as Type;
    }

    private isValidPropertyDataType():boolean{
        let true_t:Type;
        const declared_t = this.PropertyDataType_TrueType;
        const s = this.PropertyDataType_TrueType.getSymbol();

        if(s != undefined)
            true_t = s.getDeclaredType();
        else
            true_t =this.PropertyDataType_TrueType;


        // TODO check typescript built in map, set, array types.. all are unallowed
        if(true_t.isString() || true_t.isNumber()) return true;
        if(true_t.isClassOrInterface() || true_t.isIntersection()){
            // regular class or interface
            if(true_t.getSymbolOrThrow().getName() != adltypes.ADL_MAP_TYPENAME) return true;

            // map key and value validation
            // key validation
            const typeArgs = declared_t.getTypeArguments();
            if(typeArgs[0].isString() || typeArgs[0].isNumber()) return true;
            // value validation
            if(typeArgs[1].isString() || typeArgs[1].isNumber() || typeArgs[1].isClass() || typeArgs[0].isInterface) return true;
            // if all failed
            return false;
        }

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

    get MapKeyDataTypeName(): string{
        if(!this.isMap())
            throw new Error(`property ${this.Name} is not a map`);

        const true_t = this.PropertyDataType_TrueType;
        const typeArgs = true_t.getTypeArguments();
        return helpers.EscapedName(getTrueType(typeArgs[0]));
    }

    get MapValueDataTypeName(): string{
        if(!this.isMap())
            throw new Error(`property ${this.Name} is not a map`);

        const true_t = this.PropertyDataType_TrueType;
        const typeArgs = true_t.getTypeArguments();
        return helpers.EscapedName(getTrueType(typeArgs[1]));
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
        if(this.DataTypeKind == modeltypes.PropertyDataTypeKind.Map ||
           this.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap) return "Map";

        // its stops here
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

    // only valid for properties that are either `complex` or `array of complex` or `complex map`
    // if model to be serialized this needs to return undefined.
    get ComplexDataType(): modeltypes.ApiTypeModel{
        if(this.DataTypeKind != modeltypes.PropertyDataTypeKind.Complex &&
           this.DataTypeKind != modeltypes.PropertyDataTypeKind.ComplexArray &&
           this.DataTypeKind != modeltypes.PropertyDataTypeKind.ComplexMap)
                throw new Error(`propery ${this.Name} data type is not complex, array of complex types, or map of complex types`);

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

        // if we are here then we must have a symbol
        // Maps are treated differently
        if(helpers.EscapedName(true_t) == adltypes.ADL_MAP_TYPENAME){
            if(true_t.getTypeArguments()[1].isInterface() || true_t.getTypeArguments()[1].isClass())
                return modeltypes.PropertyDataTypeKind.ComplexMap;

            // just a regular map
            return modeltypes.PropertyDataTypeKind.Map;
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

    get MapKeyConstraints(): Array<modeltypes.ConstraintModel>{
        const constraints = new  Array<modeltypes.ConstraintModel>();
        if(!this.isMap) return constraints;

        const true_t = this.PropertyDataType_TrueType;
        const typeArgs = true_t.getTypeArguments();
        const typer = new helpers.typerEx(typeArgs[0]);
        const constraintTypes = typer.MatchingInherits(adltypes.INTERFACE_NAME_VALIDATIONCONSTRAINT, true);
        for( let t of constraintTypes){
            const name = helpers.EscapedName(t);
            const args = new Array<any>();
             t.getTypeArguments().forEach(arg => args.push(arg.getText()));
            const c = new property_constraint(name, args);
            constraints.push(c);
        }

        return constraints;
    }
    get MapValueConstraints(): Array<modeltypes.ConstraintModel>{
        const constraints = new  Array<modeltypes.ConstraintModel>();
        if(!this.isMap) return constraints;

        const true_t = this.PropertyDataType_TrueType;
        const typeArgs = true_t.getTypeArguments();
        const typer = new helpers.typerEx(typeArgs[1]);
        const constraintTypes = typer.MatchingInherits(adltypes.INTERFACE_NAME_VALIDATIONCONSTRAINT, true);
        for( let t of constraintTypes){
            const name = helpers.EscapedName(t);
            const args = new Array<any>();
             t.getTypeArguments().forEach(arg => args.push(arg.getText()));
            const c = new property_constraint(name, args);
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
    isMap(): boolean{
          return this.DataTypeKind == modeltypes.PropertyDataTypeKind.Map ||
                                    this.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap;

    }

    hasConstraint(constraintName:string): boolean{
        const constraints = this.Constraints;
        return (constraints.filter(c =>  c.Name == constraintName).length != 0)
    }

    load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
          createPropertyDataType(this.containerType,
                                this.containerDeclaration,
                                this.p,
                                this._apiTypeModelCreator,
                                options,
                                errors);


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
        const shouldProcessComplexType = this.DataTypeKind == modeltypes.PropertyDataTypeKind.Complex ||
                                         this.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray ||
                                         this.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap;
        if(!shouldProcessComplexType) return true;

        let target_type:Type;
        switch(this.DataTypeKind){
            case modeltypes.PropertyDataTypeKind.ComplexArray:{
                target_type = this.PropertyDataType_TrueType.getArrayElementType() as Type;
                break;
            }
            case modeltypes.PropertyDataTypeKind.ComplexMap:{
                const typeArgs = this.PropertyDataType_TrueType.getTypeArguments();
                target_type = getTrueType(typeArgs[1]);
                break;
            }
            default:{ /*must be a complex type*/
                target_type = this.PropertyDataType_TrueType;
                break;
            }
        }
        const apiTypeModel = this._apiTypeModelCreator(target_type);
        const loaded = apiTypeModel.load(options, errors);
        if(loaded)
            this._complexType = apiTypeModel;

        return loaded;
        // must be a complex map
    }
}

// base class for all property data types
class propertyDataType{
    // results to all compiler api calls are cached here
    protected _cache: Map<string, any> = new Map<string, any>();

    constructor(private typer: helpers.typerEx,
                private appeared_t: Type, /* true type of appear_t */
                private containerType: Type,
                private containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                private p: PropertySignature | PropertyDeclaration,
                private _apiTypeModelCreator: apiTypeModelCreator,
                private opts: modeltypes.apiProcessingOptions){

    }
}

function createPropertyDataType(containerType: Type,
                                containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                                p: PropertySignature | PropertyDeclaration,
                                _apiTypeModelCreator: apiTypeModelCreator,
                                opts:modeltypes.apiProcessingOptions,
                                errors: adltypes.errorList): modeltypes.AnyAdlPropertyDataTypeModel | undefined{

    const typeNode = p.getTypeNode();
    if(!typeNode){
        const message = `property ${p.getName()} failed to load, failed to get TypeNode`;
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return undefined;
    }

    const typer = new helpers.typerEx(typeNode.getType());

     // validation logic
     // weather or not the property defined as an intersection, we need to make
     // sure that only ONE type is the data type, the rest are constraints
     // fancy_property: string & Required (OK)
     // fancy_property: string & int & Required (NOT OK: data type is intersecting)
     // fancy_property: Required & MustMatch<..> (NOT OK: there is no data type)
     // TODO check for union types
     const nonConstraintsTypeNodes = typer.MatchIfNotInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
     if(nonConstraintsTypeNodes.length != 1){
     // let us assume that it was not defined
     let message = `invalid data type for property ${p.getName()}. must have a data type defined`;

     if(nonConstraintsTypeNodes.length == 1)
        message = `invalid data type for property ${p.getName()}. must have a single data type`;

        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return undefined;
     }

     // must have max of one adl.DataType
     const dataTypes = typer.MatchIfInherits(adltypes.INTERFACE_NAME_DATATYPE);
     if(dataTypes.length > 1){
        const message = `invalid data type for property ${p.getName()} multiple ${adltypes.INTERFACE_NAME_DATATYPE} defined on property, only one instance is allowed`
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return undefined;
     }

     // must have max of one OneOf(enum);
     const enumConstraints = typer.MatchIfInherits(adltypes.INTERFACE_NAME_DATATYPE);
     if(dataTypes.length > 1){
        const message = `invalid data type for property ${p.getName()} multiple ${adltypes.INTERFACE_NAME_DATATYPE} defined on property, only one instance is allowed`
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return undefined;
     }


     // data type validation and selection
     const t      = nonConstraintsTypeNodes[0]; // this the Type that represents the non constraint
     //appeared_t is what appars in property definition
     const appeared_t = getPropertyTrueType(containerDeclaration, containerType, t);
     // true_t points to declaration if it has any
     let true_t = appeared_t; // both are the same initially

     //declartion is from the compiler sympol
     const s = appeared_t.getSymbol();
     // if type has declartion then declared_t will point to it
     if(s != undefined) true_t = s.getDeclaredType();

    // container type must have a symbol since it is contains a property
    const nameOfContainer = containerType.getSymbolOrThrow().getName();

    if(true_t.isString() || true_t.isNumber() || true_t.isBoolean()) {
        // TODO load scalar datatypemodel
        opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as a scalar`);
        return {} as modeltypes.AnyAdlPropertyDataTypeModel;
    };

    if(true_t.isClassOrInterface() || true_t.isIntersection()){
        const dataTypeName = true_t.getSymbolOrThrow().getName();
        if(dataTypeName == "Map" || dataTypeName == "Set"){ /*array<T> appearts to behave exactly like an array from compiler prespective */
            const message = `property ${p.getName()} of ${nameOfContainer} is invalid. maps, and sets are not allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }
        if(true_t.getSymbolOrThrow().getName() != adltypes.ADL_MAP_TYPENAME){
            // TODO: load complex data type
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as a complex data type`);
            return {} as modeltypes.AnyAdlPropertyDataTypeModel;
        }

        // map key and value validation
        // key validation
        const typeArgs = appeared_t.getTypeArguments();
        const key_true_t = getTrueType(typeArgs[0]);
        const val_true_t = getTrueType(typeArgs[1]);
        if(!key_true_t.isString() &&  key_true_t.isNumber()){
            const message = `invalid key data type for map ${p.getName()} only string or number is allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        // value validation
        if(val_true_t.isString() && !val_true_t.isNumber() && !val_true_t.isBoolean && !val_true_t.isClassOrInterface() && !val_true_t.isIntersection()){
            const message = `invalid value type for map ${p.getName()} only (string, number, boolean, class, interface, intersection is allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        // identify if it is a complex map
        if(val_true_t.isClassOrInterface()){
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as complex map`);
            //TODO LOAD complex map
            return {} as modeltypes.AnyAdlPropertyDataTypeModel;
        }else{
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as  map`);
            //TODO LOAD complex map
            return {} as modeltypes.AnyAdlPropertyDataTypeModel;
        }
    }

    if(true_t.isArray()){
        const appeared_t = true_t.getArrayElementType();
        if(!appeared_t){
            const message = `unable to identify data type array element for property ${p.getName()} of ${nameOfContainer}`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }
        const element_t = getTrueType(appeared_t);
        // arrays of any are not allowed
        if(!element_t.isAny()){
            const message = `invalid data type array element for property ${p.getName()} of ${nameOfContainer}, any is not allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        // array of arrays are not allowed
        if(!element_t.isArray()){
            const message = `invalid data type array element for property ${p.getName()} of ${nameOfContainer}, array of arrays is not allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        // basic type is cool
        if(element_t.isString() && element_t.isNumber() && element_t.isBoolean()){
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as simple array`);
            return {} as modeltypes.AnyAdlPropertyDataTypeModel;
        }


        if(element_t.isClassOrInterface() || element_t.isIntersection()){
            const dataTypeName = element_t.getSymbolOrThrow().getName();
            // map, sets, arrays, adlmaps are not allowed
            if(dataTypeName == "Map" || dataTypeName == "Set" || dataTypeName == "Array" || dataTypeName == adltypes.ADL_MAP_TYPENAME){
                const message = `element data type for array ${p.getName()} of ${nameOfContainer} is invalid. maps, sets, arrays, adl maps are not allowed`
                opts.logger.err(message);
                errors.push(helpers.createLoadError(message));
                return undefined;
            }

            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as complex array`);
            return {} as modeltypes.AnyAdlPropertyDataTypeModel;
        }
    }

    const message = `unable to identify data type property ${p.getName()} of ${nameOfContainer}`
    opts.logger.err(message);
    errors.push(helpers.createLoadError(message));
    return undefined;
}
