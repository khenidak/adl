import { ClassDeclaration, InterfaceDeclaration, PropertySignature, PropertyDeclaration, Node, TypeGuards, TypeNode, Type } from 'ts-morph'

import * as adltypes from '@azure-tools/adl.types';
import * as modeltypes from './model.types';
import * as helpers from './helpers';

import { makeApiModelDoc } from './apijsdoc'


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
    private _property_data_type_model: modeltypes.AnyAdlPropertyDataTypeModel;
    private _name: string | undefined; // cached name

    get Docs(): modeltypes.ApiJsDoc | undefined{
        return this._property_data_type_model.Docs;
    }

    get Name(): string{
        if(this._name != undefined) return this._name;
        this._name = this.p.getName();

        return this._name;
    }

    get DataTypeModel(): modeltypes.AnyAdlPropertyDataTypeModel{
        return this._property_data_type_model;
    }

    get DataTypeName():string{
        if(modeltypes.isPropertyScalarDataType( this._property_data_type_model))
            return this._property_data_type_model.DataTypeName;

        if(modeltypes.isPropertyComplexDataType(this._property_data_type_model))
            return this._property_data_type_model.ComplexDataTypeName;

        if(modeltypes.isPropertySimpleArrayDataType(this._property_data_type_model))
            return this._property_data_type_model.ElementDataTypeName;

        if(modeltypes.isPropertyComplexArrayDataType(this._property_data_type_model))
            return this._property_data_type_model.ElementComplexDataTypeName;

        if(modeltypes.isPropertSimpleMapDataType(this._property_data_type_model))
            return this._property_data_type_model.ValueDataTypeName;

        if(modeltypes.isPropertyComplexMapDataType(this._property_data_type_model))
            return this._property_data_type_model.ValueComplexDataTypeName;

        throw new Error("unable to get data type name");
    }

    get isEnum(): boolean{
        return this._property_data_type_model.hasEnumConstraint();
    }
    get EnumValues(): any[]{
        return this._property_data_type_model.EnumValues;
    }

    get isAliasDataType(): boolean{
        return this._property_data_type_model.hasAliasDataTypeConstraint();
    }

    get AliasDataTypeName(): string{
        if(!this.isAliasDataType) return this.DataTypeName;
        return this._property_data_type_model.AliasDataTypeName;
    }

    // only valid for properties that are either `complex` or `array of complex` or `complex map`
    // if model to be serialized this needs to return undefined.
    getComplexDataTypeOrThrow(): modeltypes.ApiTypeModel{

        if(modeltypes.isPropertyComplexDataType(this._property_data_type_model))
            return this._property_data_type_model.ComplexDataTypeModel;

       if(modeltypes.isPropertyComplexArrayDataType(this._property_data_type_model))
            return this._property_data_type_model.ElementComplexDataTypeModel;

        if(modeltypes.isPropertyComplexMapDataType(this._property_data_type_model))
            return this._property_data_type_model.ValueComplexDataTypeModel;

        throw new Error(`propery ${this.Name} data type is not complex, array of complex types, or map of complex types`);
    }

    get isRemoved():boolean{
            return this._property_data_type_model.hasRemovedConstraint();
    }

    get isManaullyConverted(): boolean{
        return this._property_data_type_model.hasNoAutoConvertConstraint();
    }

    get DataTypeKind(): modeltypes.PropertyDataTypeKind{
        return this._property_data_type_model.DataTypeKind;
    }

    // returns all the constraints assigned to this property
    get Constraints(): Array<modeltypes.ConstraintModel>{
        return this._property_data_type_model.Constraints;
    }

    // constraints on Array elements (if applicable)
    get ArrayElementConstraints(): Array<modeltypes.ConstraintModel>{
        if(modeltypes.isPropertySimpleArrayDataType(this._property_data_type_model))
            return this._property_data_type_model.ElementConstraints;

        if(modeltypes.isPropertyComplexArrayDataType(this._property_data_type_model))
            return this._property_data_type_model.ElementConstraints;

        throw new Error(`propety ${this.Name} is not an array`)
    }

    get MapKeyConstraints(): Array<modeltypes.ConstraintModel>{
        if(modeltypes.isPropertSimpleMapDataType(this._property_data_type_model))
            return this._property_data_type_model.KeyValidationConstraints;

        if(modeltypes.isPropertyComplexMapDataType(this._property_data_type_model))
            return this._property_data_type_model.KeyValidationConstraints;

        throw new Error(`property ${this.Name} is not a map`);
    }
    get MapValueConstraints(): Array<modeltypes.ConstraintModel>{
        if(modeltypes.isPropertSimpleMapDataType(this._property_data_type_model))
            return this._property_data_type_model.ValueValidationConstraints;

        if(modeltypes.isPropertyComplexMapDataType(this._property_data_type_model))
            return this._property_data_type_model.ValueValidationConstraints;

        throw new Error(`property ${this.Name} is not a map`);
    }

    get isOptional(): boolean{
        return this.p.getQuestionTokenNode() != undefined;
    }

    get isNullable(): boolean{
        return this._property_data_type_model.hasNullableConstraint();
    }
    constructor(private containerType: Type,
                private containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                private p: PropertySignature | PropertyDeclaration,
                private _apiTypeModelCreator: apiTypeModelCreator){
    }

    getMapKeyDataTypeNameOrThrow(): string{
        if(modeltypes.isPropertSimpleMapDataType(this._property_data_type_model))
            return this._property_data_type_model.KeyDataTypeName;

        if(modeltypes.isPropertyComplexMapDataType(this._property_data_type_model))
            return this._property_data_type_model.KeyDataTypeName;

        throw new Error(`property ${this.Name} is not a map`);
    }

    getMapValueDataTypeNameOrThrow(): string{
        if(modeltypes.isPropertSimpleMapDataType(this._property_data_type_model))
            return this._property_data_type_model.ValueDataTypeName;

        if(modeltypes.isPropertyComplexMapDataType(this._property_data_type_model))
            return this._property_data_type_model.ValueComplexDataTypeName;

        throw new Error(`property ${this.Name} is not a map`);
    }


    getDefaultingConstraints(): Array<modeltypes.ConstraintModel>{
        return this._property_data_type_model.DefaultingConstraints;
    }

    getValidationConstraints(): Array<modeltypes.ConstraintModel>{
        return this._property_data_type_model.ValidationConstraints;
    }

    getConversionConstraints(): Array<modeltypes.ConstraintModel>{
        return this._property_data_type_model.ConversionConstraints;
    }

    // constraints on Array elements (if applicable)
    getArrayElementValidationConstraints(): Array<modeltypes.ConstraintModel>{
        if(modeltypes.isPropertySimpleArrayDataType(this._property_data_type_model))
            return this._property_data_type_model.ElementValidationConstraints;

        if((modeltypes.isPropertyComplexArrayDataType(this._property_data_type_model)))
            return this._property_data_type_model.ElementValidationConstraints;
        throw new Error(`property ${this.Name} is not array`)
    }

    // short cut to identify if property is array
    isArray(): boolean{
        return this.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexArray || this.DataTypeKind == modeltypes.PropertyDataTypeKind.ScalarArray;
    }
    isMap(): boolean{
          return this.DataTypeKind == modeltypes.PropertyDataTypeKind.Map || this.DataTypeKind == modeltypes.PropertyDataTypeKind.ComplexMap;
    }

    load(options:modeltypes.apiProcessingOptions, errors: adltypes.errorList): boolean{
         const property_data_type_model = createPropertyDataType(this.containerType,
                                                           this.containerDeclaration,
                                                           this.p,
                                                           this._apiTypeModelCreator,
                                                           options,
                                                           errors);

        // this data type is invalid
        if(property_data_type_model == undefined){
            return false;
        }
        this._property_data_type_model = property_data_type_model;
        return true;
    }
}

// base class for all property data types
class property_DataType implements modeltypes.PropertyDataType{
    // results to all compiler api calls are cached here
    protected _cache: Map<string, any> = new Map<string, any>();

    protected getConstraintsByType(constraintType: string): Array<modeltypes.ConstraintModel>{
        const constraints = new  Array<modeltypes.ConstraintModel>();
        const constraintsTypes = this.typer.MatchIfInherits(constraintType);
        for(let tt of constraintsTypes){
            const name = helpers.EscapedName(tt);
            const args = new Array<any>();
            const typeArgs = tt.getTypeArguments();

            for(const arg of typeArgs){
                if(arg.isTuple()) /*process as tuple*/{
                   args.push(arg.getText());
                }else{
                    args.push(helpers.quotelessString(arg.getText()))
                }
            }
            const c = new property_constraint(name, args);
            // add it
            constraints.push(c);
        }
        return constraints;
    }


    constructor(protected kind: modeltypes.PropertyDataTypeKind,
                protected typer: helpers.typerEx,
                protected appeared_t: Type, /* given string & mustMatch & something & something, appeared is string */
                protected containerType: Type,
                protected containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                protected p: PropertySignature | PropertyDeclaration,
                protected opts: modeltypes.apiProcessingOptions){

    }

    // documentation on property
    get Docs (): modeltypes.ApiJsDoc | undefined{
        if(this._cache.has("Docs")) return this._cache.get("docs");
        const parsedDocs = makeApiModelDoc(this.p, this.opts, new adltypes.errorList() /* we don't expect errors in doc loading */);
        this._cache.set("Docs", parsedDocs);
        return this._cache.get("Docs");
    }

    // identify DataTypeKind by interrogating the appeared type of this property
    get DataTypeKind(): modeltypes.PropertyDataTypeKind{
        return this.kind;
    }

    // finds all constraints defined on this propeties
    get Constraints(): Array<modeltypes.ConstraintModel>{
        if(this._cache.has("Constraints"))
            return this._cache.get("Constraints") as Array<modeltypes.ConstraintModel>;

        const constraints = new Array<modeltypes.ConstraintModel>();
        const constraintsTypes = this.typer.MatchIfInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
        for(let tt of constraintsTypes){
            const name = helpers.EscapedName(tt);
            const args = new Array<any>();
            // get args
            const typeArgs = tt.getTypeArguments();
            for(const arg of typeArgs){
                if(arg.isTuple()) /*process as tuple*/{
                   args.push(arg.getText());
                }else{
                    args.push(helpers.quotelessString( arg.getText()))
                }
            }
            const c = new property_constraint(name, args);

            // add it
            constraints.push(c);
        }

        this._cache.set("Constraints", constraints);
        return this._cache.get("Constraints") as Array<modeltypes.ConstraintModel>;
    }

    // finds if this property is constraint by adl.Removed
    hasRemovedConstraint(): boolean{
        if(this._cache.has("hasRemovedConstraint"))
            return this._cache.get("hasRemovedConstraint") as boolean;

        this._cache.set("hasRemovedConstraint", this.hasConstraint(adltypes.CONSTRAINT_NAME_REMOVED));
        return this._cache.get("hasRemovedConstraint") as boolean;
    }

    hasNoAutoConvertConstraint():boolean{
         if(this._cache.has("hasNoAutoConvertConstraint"))
            return this._cache.get("hasNoAutoConvertConstraint") as boolean;

        this._cache.set("hasNoAutoConvertConstraint", this.hasConstraint(adltypes.CONSTRAINT_NAME_NOAUTOCONVERSION));
        return this._cache.get("hasNoAutoConvertConstraint") as boolean;

    }
    // finds if this property is constraint by AdlDataType
    hasAliasDataTypeConstraint(): boolean{
        if(this._cache.has("hasAliasDataTypeConstraint"))
            return this._cache.get("hasAliasDataTypeConstraint") as boolean;

        const dataTypes =  this.getConstraintsByType(adltypes.INTERFACE_NAME_DATATYPE);
        this._cache.set("hasAliasDataTypeConstraint", dataTypes.length == 1); // we pre validate that only one of these exist
        return this._cache.get("hasAliasDataTypeConstraint") as boolean;
    }

    // finds AdlDataType and returns the type arguments for it
    get AliasDataTypeName(): string{
         if(this._cache.has("AliasDataTypeName"))
            return this._cache.get("AliasDataTypeName") as string;

         if(!this.hasAliasDataTypeConstraint()){
            this._cache.set("AliasDataTypeName" ,"");
            return this._cache.get("AliasDataTypeName") as string;
         }

        // we know that it must have one since this.hasAliasDataTypeConstraint returned true;
        const dataTypes =  this.getConstraintsByType(adltypes.INTERFACE_NAME_DATATYPE);
        const c = dataTypes[0];
        this._cache.set("AliasDataTypeName" ,c. Arguments[0]);
        return this._cache.get("AliasDataTypeName") as string;
    }

    // finds if enum constraint is defined on this property
    hasEnumConstraint(): boolean{
        if(this._cache.has("hasEnumConstraint"))
            return this._cache.get("hasEnumConstraint") as boolean;

        const enumConstraints =  this.getConstraintsByType(adltypes.INTERFACE_NAME_ONEOF);
        this._cache.set("hasEnumConstraint", enumConstraints.length == 1); // we pre validate that only one of these exist
        return this._cache.get("hasEnumConstraint") as boolean;
    }

    get EnumValues(): any[]{
         if(this._cache.has("EnumValues"))
            return this._cache.get("EnumValues") as any[];

        const vals: any[] = [];
        if(!this.hasEnumConstraint()){
            this._cache.set("EnumValues", vals);
            return this._cache.get("EnumValues") as any[];
        }

        const enumConstraints = this.getConstraintsByType(adltypes.INTERFACE_NAME_ONEOF);
        this._cache.set("EnumValues", enumConstraints[0].Arguments[0]); // also pre validated
        return this._cache.get("EnumValues") as any[];
    }

    get DefaultingConstraints(): Array<modeltypes.ConstraintModel>{
        if(this._cache.has("DefaultingConstraints"))
            return this._cache.get("DefaultingConstraints") as Array<modeltypes.ConstraintModel>;

        this._cache.set("DefaultingConstraints", this.getConstraintsByType(adltypes.INTERFACE_NAME_DEFAULTINGCONSTRAINT));
        return this._cache.get("DefaultingConstraints") as Array<modeltypes.ConstraintModel>;
    }

    get ValidationConstraints(): Array<modeltypes.ConstraintModel>{
        if(this._cache.has("ValidationConstraints"))
            return this._cache.get("ValidationConstraints") as Array<modeltypes.ConstraintModel>;

        this._cache.set("ValidationConstraints", this.getConstraintsByType(adltypes.INTERFACE_NAME_VALIDATIONCONSTRAINT));
        return this._cache.get("ValidationConstraints") as Array<modeltypes.ConstraintModel>;
    }

    get ConversionConstraints(): Array<modeltypes.ConstraintModel>{
         if(this._cache.has("ConversionConstraints"))
            return this._cache.get("ConversionConstraints") as Array<modeltypes.ConstraintModel>;

        this._cache.set("ConversionConstraints", this.getConstraintsByType(adltypes.INTERFACE_NAME_CONVERSIONCONSTRAINT));
        return this._cache.get("ConversionConstraints") as Array<modeltypes.ConstraintModel>;
    }

    //this call is not cached and should be used infrequently.
    hasConstraint(name:string):boolean{
        const constraints = this.Constraints;
        return constraints.filter(c => c.Name === name).length > 0;
    }

    hasNullableConstraint(): boolean{
        if(this._cache.has("hasNullableConstraint"))
            return this._cache.get("hasNullableConstraint") as boolean;

        const nullableConstraints =  this.getConstraintsByType(adltypes.CONSTRAINT_NAME_NULLABLE);
        this._cache.set("hasNullableConstraint", nullableConstraints.length == 1);
        return this._cache.get("hasNullableConstraint") as boolean;
    }
}
// scalar data type
export class  property_ScalarDataType extends property_DataType
                                     implements modeltypes.PropertyScalarDataType{

       constructor(typer: helpers.typerEx,
                   appeared_t: Type, /* true type of appear_t */
                   containerType: Type,
                   containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                   p: PropertySignature | PropertyDeclaration,
                   opts: modeltypes.apiProcessingOptions){
       super(modeltypes.PropertyDataTypeKind.Scalar,
             typer,
             appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);
    }

    get DataTypeName(): string{
        if(this._cache.has("DataTypeName")) return this._cache.get("DataTypeName") as string;
        //special case for boolean data type
        // because we unpack it anyway (even if it is not an intersection), we always pick "false"
        // literal (check helpers.isboolean() implementation)
        if(helpers.isBoolean(this.appeared_t)){
            this._cache.set("DataTypeName","boolean");
            return this._cache.get("DataTypeName") as string;
        }

        this._cache.set("DataTypeName", helpers.EscapedName(this.appeared_t));
        return this._cache.get("DataTypeName") as string;
    }
}


export class  property_ComplexDataType extends property_DataType
                                     implements modeltypes.PropertyComplexDataType{

       constructor(typer: helpers.typerEx,
                   appeared_t: Type, /* property type as it appears */
                   containerType: Type,
                   containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                   p: PropertySignature | PropertyDeclaration,
                   private _apiTypeModelCreator: apiTypeModelCreator,
                   opts: modeltypes.apiProcessingOptions){
       super(modeltypes.PropertyDataTypeKind.Complex,
             typer,
             appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);
    }

    get ComplexDataTypeName(): string{
        if(this._cache.has("ComplexDataTypeName")) return this._cache.get("ComplexDataTypeName") as string;
        this._cache.set("ComplexDataTypeName",helpers.EscapedName(this.appeared_t));
        return this._cache.get("ComplexDataTypeName") as string;

    }
    get ComplexDataTypeModel(): modeltypes.ApiTypeModel{
        if(this._cache.has("ComplexDataTypeModel")) return this._cache.get("ComplexDataTypeModel") as modeltypes.ApiTypeModel;
        // parsing complex model is part of loading logic
        throw new Error("Complex data model is not loaded, did you call load();")
    }

    load(errors: adltypes.errorList): boolean{
       const apiTypeModel = this._apiTypeModelCreator(this.appeared_t);

        const loaded = apiTypeModel.load(this.opts, errors);
        if(!loaded) return loaded;

        this._cache.set("ComplexDataTypeModel",  apiTypeModel);
        return true;
    }
}
export class  property_SimpleArrayDataType extends property_DataType
                                     implements modeltypes.PropertySimpleArrayDataType{
        private _element_scalar_data_type:property_ScalarDataType;

       constructor(element_appeared_t: Type, /* element true Type as it appears*/
                   typer_element: helpers.typerEx,
                   typer: helpers.typerEx,
                   appeared_t: Type, /* property type as it appears */
                   containerType: Type,
                   containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                   p: PropertySignature | PropertyDeclaration,
                   opts: modeltypes.apiProcessingOptions){
       super(modeltypes.PropertyDataTypeKind.ScalarArray,
             typer,
             appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);

        // we use a scalar type to work with element itself
       this._element_scalar_data_type = new property_ScalarDataType(
             typer_element,
             element_appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);
    }

    get ElementDataTypeName(): string{
        return this._element_scalar_data_type.DataTypeName;
    }

    get ElementValidationConstraints():Array<modeltypes.ConstraintModel>{
        return this._element_scalar_data_type.ValidationConstraints;
    }
    get ElementAliasDataTypeName(): string{
        return this._element_scalar_data_type.AliasDataTypeName;
    }

    get ElementEnumValues(): any[]{
        return this._element_scalar_data_type.EnumValues;
    }

    get ElementConstraints():Array<modeltypes.ConstraintModel>{
        return this._element_scalar_data_type.Constraints;
    }

    hasElementAliasDataTypeConstraint(): boolean{
        return this._element_scalar_data_type.hasAliasDataTypeConstraint();
    }

    hasElementEnumConstraint(): boolean{
        return this._element_scalar_data_type.hasEnumConstraint();
    }

    isElementNullable(): boolean{
        return this._element_scalar_data_type.hasNullableConstraint();
    }
}
export class  property_ComplexArrayDataType extends property_DataType
                                     implements modeltypes.PropertyComplexArrayDataType{

        private _element_complex_data_type:property_ComplexDataType;

       constructor(element_appeared_t: Type, /*array element Type as it appears*/
                   typer_element: helpers.typerEx,
                   typer: helpers.typerEx,
                   appeared_t: Type, /* property type as it appears */
                   containerType: Type,
                   containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                   p: PropertySignature | PropertyDeclaration,
                   private _apiTypeModelCreator: apiTypeModelCreator,
                   opts: modeltypes.apiProcessingOptions){
       super(modeltypes.PropertyDataTypeKind.ComplexArray,
             typer,
             appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);

        // we use a complex type to work with element itself
       this._element_complex_data_type = new property_ComplexDataType(
             typer_element,
             element_appeared_t,
             containerType,
             containerDeclaration,
             p,
             _apiTypeModelCreator,
             opts);
    }

    get ElementComplexDataTypeName(): string{
        return this._element_complex_data_type.ComplexDataTypeName;
    }

    get ElementComplexDataTypeModel(): modeltypes.ApiTypeModel{
        return this._element_complex_data_type.ComplexDataTypeModel;

    }
    get ElementValidationConstraints():Array<modeltypes.ConstraintModel>{
        return this._element_complex_data_type.ValidationConstraints;
    }
    get ElementAliasDataTypeName(): string{
        return this._element_complex_data_type.AliasDataTypeName;
    }

    get ElementEnumValues(): any[]{
        return this._element_complex_data_type.EnumValues;
    }

    hasElementAliasDataTypeConstraint(): boolean{
        return this._element_complex_data_type.hasAliasDataTypeConstraint();
    }

    hasElementEnumConstraint(): boolean{
        return this._element_complex_data_type.hasEnumConstraint();
    }

    isElementNullable(): boolean{
        return this._element_complex_data_type.hasNullableConstraint();
    }

    get ElementConstraints():Array<modeltypes.ConstraintModel>{
        return this._element_complex_data_type.Constraints;
    }


    load(errors: adltypes.errorList): boolean{
        return this._element_complex_data_type.load(errors);
    }
}

export class  property_SimpleMapDataType extends property_DataType
                                     implements modeltypes.PropertySimpleMapDataType{
       private _key_scalar_data_type:property_ScalarDataType;
       private _value_scalar_data_type:property_ScalarDataType;

       constructor(key_appeared_t: Type, /*map key Type as it appears*/
                   key_typer:helpers.typerEx,
                   value_appeared_t: Type, /* map value type as it appears */
                   value_typer: helpers.typerEx,
                   typer: helpers.typerEx,
                   appeared_t: Type,  /* property type as it appears */
                   containerType: Type,
                   containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                   p: PropertySignature | PropertyDeclaration,
                   opts: modeltypes.apiProcessingOptions){
       super(modeltypes.PropertyDataTypeKind.Map,
             typer,
             appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);

        // we use a scalar type to work with map key
       this._key_scalar_data_type = new property_ScalarDataType(
             key_typer,
             key_appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);

        // we use a scalar type to work with map value
       this._value_scalar_data_type = new property_ScalarDataType(
             value_typer,
             value_appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);
    }

    get KeyDataTypeName(): string{
        return this._key_scalar_data_type.DataTypeName;
    }

    get KeyConstraints(): Array<modeltypes.ConstraintModel>{
        return this._key_scalar_data_type.Constraints;
    }

    get KeyValidationConstraints():Array<modeltypes.ConstraintModel>{
        return this._key_scalar_data_type.ValidationConstraints;
    }

    get ValueDataTypeName(): string{
        return this._key_scalar_data_type.DataTypeName;
    }


    get KeyAliasDataTypeName(): string{
        return this._key_scalar_data_type.AliasDataTypeName;
    }

    get KeyEnumValues(): any[]{
        return this._key_scalar_data_type.EnumValues;
    }

    hasKeyAliasDataTypeConstraint(): boolean{
        return this._key_scalar_data_type.hasAliasDataTypeConstraint();
    }

    hasKeyEnumConstraint(): boolean{
        return this._key_scalar_data_type.hasEnumConstraint();
    }

    get ValueAliasDataTypeName(): string{
        return this._value_scalar_data_type.AliasDataTypeName;

    }

    get ValueEnumValues(): any[]{
        return this._value_scalar_data_type.EnumValues;
    }

    get  ValueConstraints(): Array<modeltypes.ConstraintModel>{
        return this._value_scalar_data_type.Constraints;
    }

    get ValueValidationConstraints(): Array<modeltypes.ConstraintModel>{
        return this._value_scalar_data_type.ValidationConstraints;
    }

    hasValueAliasDataTypeConstraint(): boolean{
        return this._value_scalar_data_type.hasAliasDataTypeConstraint();
    }

    hasValueEnumConstraint(): boolean{
        return this._value_scalar_data_type.hasEnumConstraint();
    }

    get isValueNullable(): boolean{
        return this._value_scalar_data_type.hasNullableConstraint();
    }
}
export class  property_ComplexMapDataType extends property_DataType
                                     implements modeltypes.PropertyComplexMapDataType{
       private _key_scalar_data_type:property_ScalarDataType;
       private _value_Complex_data_type:property_ComplexDataType;
       constructor(key_appeared_t: Type, /*map key Type as it appears*/
                   key_typer:helpers.typerEx,
                   value_appeared_t: Type, /* map value type as it appears */
                   value_typer: helpers.typerEx,
                   typer: helpers.typerEx,
                   appeared_t: Type, /* property type as it appears */
                   containerType: Type,
                   containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                   p: PropertySignature | PropertyDeclaration,
                   private _apiTypeModelCreator: apiTypeModelCreator,
                   opts: modeltypes.apiProcessingOptions){
       super(modeltypes.PropertyDataTypeKind.ComplexMap,
             typer,
             appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);

        // we use a scalar type to work with map key
       this._key_scalar_data_type = new property_ScalarDataType(
             key_typer,
             key_appeared_t,
             containerType,
             containerDeclaration,
             p,
             opts);

        // we use a scalar type to work with map value (complex type)
       this._value_Complex_data_type = new property_ComplexDataType(
             value_typer,
             value_appeared_t,
             containerType,
             containerDeclaration,
             p,
            _apiTypeModelCreator,
             opts);
    }

    get KeyDataTypeName(): string{
        return this._key_scalar_data_type.DataTypeName;
    }

    get KeyConstraints(): Array<modeltypes.ConstraintModel>{
        return this._key_scalar_data_type.Constraints;
    }

    get KeyValidationConstraints():Array<modeltypes.ConstraintModel>{
        return this._key_scalar_data_type.ValidationConstraints;
    }

    get KeyAliasDataTypeName(): string{
        return this._key_scalar_data_type.AliasDataTypeName;
    }

    get KeyEnumValues(): any[]{
        return this._key_scalar_data_type.EnumValues;
    }

    hasKeyAliasDataTypeConstraint(): boolean{
        return this._key_scalar_data_type.hasAliasDataTypeConstraint();
    }

    hasKeyEnumConstraint(): boolean{
        return this._key_scalar_data_type.hasEnumConstraint();
    }

    get ValueConstraints(): Array<modeltypes.ConstraintModel>{
        return this._value_Complex_data_type.Constraints;
    }

    get isValueNullable(): boolean{
        return this._value_Complex_data_type.hasNullableConstraint();
    }

    get ValueValidationConstraints(): Array<modeltypes.ConstraintModel>{
        return this._value_Complex_data_type.ValidationConstraints;
    }

    get ValueComplexDataTypeName(): string{
        return this._value_Complex_data_type.ComplexDataTypeName
    }

    get ValueComplexDataTypeModel(): modeltypes.ApiTypeModel{
        return this._value_Complex_data_type.ComplexDataTypeModel;
    }

    load(errors: adltypes.errorList): boolean{
        return this._value_Complex_data_type.load(errors);
    }
}

function validateDataType(containerType: Type,
                          containerDeclaration: ClassDeclaration| InterfaceDeclaration,
                          typer: helpers.typerEx,
                          propertyName: string,
                          nameOfContainer: string,
                          opts: modeltypes.apiProcessingOptions,
                          errors:adltypes.errorList): boolean{
     // typer validation logic
     // weather or not the property defined as an intersection, we need to make
     // sure that only ONE type is the data type, the rest are constraints
     // fancy_property: string & Required (OK)
     // fancy_property: string & int & Required (NOT OK: data type is intersecting)
     // fancy_property: Required & MustMatch<..> (NOT OK: there is no data type)
     // TODO check for union types
     const nonConstraintsTypeNodes = typer.MatchIfNotInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);
     if(nonConstraintsTypeNodes.length != 1){
     // let us assume that it was not defined
     let message = `invalid data type for property ${nameOfContainer}/${propertyName}. must have a data type defined`;

     if(nonConstraintsTypeNodes.length == 1)
        message = `invalid data type for property ${nameOfContainer}/${propertyName}. must have a single data type`;

        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return false;
     }

     // must have max of one adl.DataType
     const dataTypes = typer.MatchIfInherits(adltypes.INTERFACE_NAME_DATATYPE);
     if(dataTypes.length > 1){
        const message = `invalid data type for property ${nameOfContainer}/${propertyName} multiple ${adltypes.INTERFACE_NAME_DATATYPE} defined on property, only one instance is allowed`
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return false;
     }

     // must have max of one OneOf(enum);
     const enumConstraints = typer.MatchIfInherits(adltypes.INTERFACE_NAME_ONEOF);
     if(dataTypes.length > 1){
        const message = `invalid data type for property ${nameOfContainer}/${propertyName} multiple ${adltypes.INTERFACE_NAME_ONEOF} defined on property, only one instance is allowed`
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return false;
     }

    const nullableConstraints = typer.MatchIfInherits(adltypes.CONSTRAINT_NAME_NULLABLE);
    if(nullableConstraints.length > 1){
        const message = `invalid data type for property ${nameOfContainer}/${propertyName} multiple ${adltypes.CONSTRAINT_NAME_NULLABLE} defined on property, only one instance is allowed`
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return false;
    }

      // data type validation and selection
     const t  = nonConstraintsTypeNodes[0]; // this the Type that represents the non constraint
     //appeared_t is what appars in property definition
     const appeared_t = getPropertyTrueType(containerDeclaration, containerType, t);
     // flush out everything we don't work with
     // union types will be introduced when we build for unions
     // unions are only allowed in boolean because of the way the compiler represents boolean internally
     // should also check for literals
     if(t.isUnion() && !helpers.isBoolean(appeared_t)){
        const message = `invalid data type for property ${nameOfContainer}/${propertyName}  unions are not allowed`
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return false;
     }

   return true;
}
// validates and creates property data type mode;
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
    // container type must have a symbol since it is contains a property
    const nameOfContainer = helpers.EscapedName(containerType);

    const original_t = typeNode.getType();
    const typer = new helpers.typerEx(original_t);

    if(!validateDataType(containerType, containerDeclaration, typer, p.getName(), nameOfContainer, opts, errors))
        return undefined;

     const nonConstraintsTypeNodes = typer.MatchIfNotInherits(adltypes.INTERFACE_NAME_PROPERTYCONSTRAINT);

     // data type validation and selection
     const t  = nonConstraintsTypeNodes[0]; // this the Type that represents the non constraint
     //appeared_t is what appars in property definition
     const appeared_t = getPropertyTrueType(containerDeclaration, containerType, t);

     // true_t points to declaration if it has any
     let true_t = appeared_t; // both are the same initially

     //declartion is from the compiler sympol
     const s = appeared_t.getSymbol();
     // if type has declartion then declared_t will point to it
     if(s != undefined) true_t = s.getDeclaredType();

    if(true_t.isString() || true_t.isNumber() || helpers.isBoolean(true_t)) {
        opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as a scalar`);
        return new property_ScalarDataType(typer,
                                          appeared_t,
                                          containerType,
                                          containerDeclaration,
                                          p,
                                          opts);
    };
    if(appeared_t.isArray()){
        const element_t = appeared_t.getArrayElementType();
        if(!element_t){
            const message = `unable to identify data type array element for property ${p.getName()} of ${nameOfContainer}`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        const element_appeared_t = getPropertyTrueType(containerDeclaration, containerType, element_t);
        // arrays of any are not allowed
        if(element_appeared_t.isAny()){
            const message = `invalid data type array element for property ${p.getName()} of ${nameOfContainer}, any is not allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        // array of arrays are not allowed
        if(element_appeared_t.isArray()){
            const message = `invalid data type array element for property ${p.getName()} of ${nameOfContainer}, array of arrays is not allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }
        // validate the element
        const typer_element = new helpers.typerEx(element_t);
        if(!validateDataType(containerType, containerDeclaration, typer_element, `${p.getName()}/element`, nameOfContainer, opts, errors))
            return undefined;

        // basic type is cool
        if(element_appeared_t.isString() || element_appeared_t.isNumber() || helpers.isBoolean(element_appeared_t)){
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as simple array`);
            return new property_SimpleArrayDataType(
                                            element_appeared_t,
                                            typer_element,
                                            typer,
                                            appeared_t,
                                            containerType,
                                            containerDeclaration,
                                            p,
                                            opts);
        }

        if(element_appeared_t.isClassOrInterface() || element_appeared_t.isIntersection()){
            const dataTypeName = element_appeared_t.getSymbolOrThrow().getName();
            // map, sets, arrays, adlmaps are not allowed
            if(dataTypeName == "Map" || dataTypeName == "Set" || dataTypeName == "Array" || dataTypeName == adltypes.ADL_MAP_TYPENAME){
                const message = `element data type for array ${p.getName()} of ${nameOfContainer} is invalid. maps, sets, arrays, adl maps are not allowed`
                opts.logger.err(message);
                errors.push(helpers.createLoadError(message));
                return undefined;
            }

            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as complex array`);
            const complexArray = new property_ComplexArrayDataType(
                                            element_appeared_t,
                                            typer_element,
                                            typer,
                                            appeared_t,
                                            containerType,
                                            containerDeclaration,
                                            p,
                                            _apiTypeModelCreator,
                                            opts);
            if(!complexArray.load(errors))  return undefined;
                return complexArray;
        }
        // it is an array that we failed to process
        const message = `failed to process array ${p.getName()} of ${nameOfContainer}`
        opts.logger.err(message);
        errors.push(helpers.createLoadError(message));
        return undefined;
    }

    if(true_t.isClassOrInterface() || true_t.isIntersection()){
        const dataTypeName = true_t.getSymbolOrThrow().getName();
        if(dataTypeName == "Map" || dataTypeName == "Set"){ /*array<T> appearts to behave exactly like an array from compiler prespective */
            const message = `property ${p.getName()} of ${nameOfContainer} is invalid. maps, and sets are not allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        if(true_t.getSymbolOrThrow().getName() != adltypes.ADL_MAP_TYPENAME){
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as a complex data type`);
            const complexPropertyDataType =  new property_ComplexDataType(typer,
                                                                          appeared_t,
                                                                          containerType,
                                                                          containerDeclaration,
                                                                          p,
                                                                          _apiTypeModelCreator,
                                                                          opts);

            if(!complexPropertyDataType.load(errors))  return undefined;
            return complexPropertyDataType;
        }

        // map key and value validation
        // key validation
        const typeArgs = appeared_t.getTypeArguments();
        const key_appeared_t = typeArgs[0];
        const value_appeared_t = typeArgs[1];
        const key_true_t = getPropertyTrueType(containerDeclaration, containerType, key_appeared_t);
        const val_true_t = getPropertyTrueType(containerDeclaration, containerType, value_appeared_t);

        // validate the element
        const typer_key = new helpers.typerEx(key_appeared_t);
        if(!validateDataType(containerType, containerDeclaration, typer_key, `${p.getName()}/key`, nameOfContainer, opts, errors))
            return undefined;

        const typer_value = new helpers.typerEx(value_appeared_t);
        if(!validateDataType(containerType, containerDeclaration, typer_value, `${p.getName()}/value`, nameOfContainer, opts, errors))
            return undefined;

        // key can not be nullable
        const nullableKeyConstraints = typer_key.MatchingInherits(adltypes.CONSTRAINT_NAME_NULLABLE, true);
        if(nullableKeyConstraints.length > 0){
            const message = `invalid key data type for map ${p.getName()} key can not be nullable`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        if(!key_true_t.isString() &&  key_true_t.isNumber()){
            const message = `invalid key data type for map ${p.getName()} only string or number is allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        // value validation
        if(!val_true_t.isString() && !val_true_t.isNumber() && !helpers.isBoolean(val_true_t) && !val_true_t.isClassOrInterface() && !val_true_t.isIntersection()){
            const message = `invalid value type for map ${p.getName()} only (string, number, boolean, class, interface, intersection is allowed`
            opts.logger.err(message);
            errors.push(helpers.createLoadError(message));
            return undefined;
        }

        // identify if it is a complex map
        if(!val_true_t.isClassOrInterface()){
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as simple map`);
            return new property_SimpleMapDataType(
                   key_true_t,
                   typer_key,
                   val_true_t,
                   typer_value,
                   typer,
                   appeared_t,
                   containerType,
                   containerDeclaration,
                   p,
                   opts);
        }else{
            opts.logger.verbose(`property ${p.getName()} of ${nameOfContainer} is idenfined as complex map`);
            const complexMap = new property_ComplexMapDataType(
                   key_true_t,
                   typer_key,
                   val_true_t,
                   typer_value,
                   typer,
                   appeared_t,
                   containerType,
                   containerDeclaration,
                   p,
                   _apiTypeModelCreator,
                   opts);
            if(!complexMap.load(errors))  return undefined;
            return complexMap;
        }
    }

    const message = `unable to identify data type for property ${p.getName()} of ${nameOfContainer}`
    opts.logger.err(message);
    errors.push(helpers.createLoadError(message));
    return undefined;
}
