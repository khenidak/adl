import { CommandLineAction, CommandLineChoiceParameter, CommandLineFlagParameter, CommandLineStringListParameter, CommandLineStringParameter } from '@microsoft/ts-command-line'
import { appContext } from './appContext'

import * as adlruntime from '@azure-tools/adl.runtime'

/* shows what is in store
 * in a runtime env, this will connect to rpaas api server
 * and use it as a store, to red api definitions from
 */

/* @khenidak
* How does this should look like
* ./cairo list (showes evertything)
* ./cairo list --show-docs (shows the documentation - if any - for each model)
* ./cairo list --only-apis (shows api spec)
* ./cairo list -- only-apis --only--versions (shows apis + versions)
* ~ normalized
* ~ versioned type
* ~ filtering
* ./cairo list <whatever> --filter="api=x"
* ./cairo list <whatever> --filter="api=x,api=y,version=x,normalized=y"
* sadly rush stack is badly documented. so the best source of understanding different
* flags go to
* https://github.com/microsoft/rushstack/blob/master/libraries/ts-command-line/src/test/CommandLineParameter.test.ts
*/
export class showStoreAction extends CommandLineAction {
    private _scope: CommandLineChoiceParameter;
    private _filter: CommandLineStringParameter; /* TODO */
    private _show_docs: CommandLineFlagParameter;

    private getPropertiesConstraintsAsText(p: adlruntime.ApiTypePropertyModel): string{
        let constraintsAsText = ""
        if(!p.isEnum){
            for(const c of p.Constraints){
                constraintsAsText = `${constraintsAsText} | ${c.Name}(${c.Arguments.join(",")})`;
            }
            return constraintsAsText;
        }
        constraintsAsText = `enum${p.EnumValues}`;
        return constraintsAsText;
    }
    private printDocs(prefix: string, docs: adlruntime.ApiJsDoc | undefined){
        if(docs == undefined || this._show_docs.value == false) return;
        console.log(` ${prefix}docs:`)
        for(const l of docs.text.split("\n"))
            console.log(`  ${prefix}${l}`);

        console.log(` ${prefix}tags:`)
        for(const [k,v] of docs.tags){
            console.log(`  ${prefix}${k}: ${v}`)
        }
    }

    private printModel(scope: string, model: adlruntime.ApiModel):void{
        // Print api model name
        var prefix = "";
        console.log(`${prefix} Api Model: ${model.Name}`);
    }

    private printApiTypeModel(prefix: string, model:adlruntime.ApiTypeModel): void{
        // properties
        for(const prop  of model.Properties){
            if(prop.isRemoved) return;
            console.log(`${prefix} Property:${prop.Name}(${prop.DataTypeName}/${prop.AliasDataTypeName}) ${this.getPropertiesConstraintsAsText(prop)}`);
            if(prop.DataTypeKind == adlruntime.PropertyDataTypeKind.Complex ||
                prop.DataTypeKind == adlruntime.PropertyDataTypeKind.ComplexArray ||
                prop.DataTypeKind == adlruntime.PropertyDataTypeKind.ComplexMap){
                    this.printDocs(` ${prefix}`, prop.Docs);
                    this.printApiTypeModel(prefix + " ", prop.getComplexDataTypeOrThrow())
            }
            if(prop.isMap()){
                let constraintAsText = ""
                for(const c of prop.MapKeyConstraints){
                    constraintAsText = constraintAsText + `${c.Name}(` + c.Arguments.join(",") +") | ";
                }

                if(constraintAsText.length > 0)
                    console.log(`${prefix} * KeyConstraints: ${constraintAsText}`);

                constraintAsText = ""
                for(const c of prop.MapValueConstraints){
                    constraintAsText = constraintAsText + `${c.Name}(` + c.Arguments.join(",") +") | ";
                }
                if(constraintAsText.length > 0)
                    console.log(`${prefix} * ValueConstraints: ${constraintAsText}`);
            }
        }
    }
    private printNormalizedTypes(scope:string, normalizedTypes: Iterable<adlruntime.NormalizedApiTypeModel>): void{
        if(scope != "all" && scope != "normalized") return;
        var prefix = "";
        // normalized types
        console.log(`${prefix} Normalized Types:`);
        for(const normalizedType of normalizedTypes){
            prefix = "  ";
            let constraintsAsText = ""
            for(const c of normalizedType.Constraints){
                constraintsAsText = constraintsAsText + c.Name + "\t"
            }
            if(constraintsAsText.length > 0){
                constraintsAsText = "> " + constraintsAsText;
            }
            console.log(`${prefix} + Type: ${normalizedType.Name} ${constraintsAsText}`);
            this.printDocs(` ${prefix}`, normalizedType.Docs);
            prefix = "    ";
            this.printApiTypeModel(prefix, normalizedType);
       }
    }

    private printApiVersions(scope: string, apiVersions: Iterable<adlruntime.ApiVersionModel>):void{
        var prefix = "";
        if(scope != "all" && scope != "api-versions" && scope != "versioned") return;
            // api versions
            console.log(`${prefix} Versions:`);
            for(let apiVersion of apiVersions){
                prefix = "  ";
                console.log(`${prefix} + api-version: ${apiVersion.Name}`);
                this.printDocs(`  ${prefix}`, apiVersion.Docs);
                this.printVersionedTypes(scope, apiVersion.VersionedTypes);
            }
    }

    private printVersionedTypes(scope: string, versionedTypes: Iterable<adlruntime.VersionedApiTypeModel>):void{
        var prefix = "";
        // types in version
        if(scope != "all" && scope != "versioned") return;
        for(const versionedType of versionedTypes){
            prefix = "    ";
            let constraintsAsText = ""
            for(const c of versionedType.Constraints){
                constraintsAsText = constraintsAsText + c.Name + "\t"
            }

            if(constraintsAsText.length > 0){
                constraintsAsText = "> " + constraintsAsText;
            }

            console.log(`${prefix} Type:${versionedType.Name} ${constraintsAsText}`);
            this.printDocs(` ${prefix}`, versionedType.Docs);
            prefix = "     ";
            this.printApiTypeModel(prefix, versionedType);
        }
    }

    public constructor(private ctx: appContext) {
    super({
      actionName: 'list',
      summary: 'shows the apis already loaded in the store',
      documentation: ''
    });
  }


  protected onExecute(): Promise<void> {
            // TODO: pretty print, json yaml printing etc.
            return new Promise<void>( () => {
                const scope = this._scope.value ? this._scope.value : "all";

                // dumb print information from store as is
                var models = this.ctx.store.ApiModels;
                // api infos
                for(let model of models){
                        this.printModel(scope, model);
                        this.printNormalizedTypes(scope, model.NormalizedTypes);
                        this.printApiVersions(scope, model.Versions);
                    }
            });
  }

  protected onDefineParameters(): void { // abstract

    this._scope = this.defineChoiceParameter({
      parameterLongName: '--scope',
      parameterShortName: '-s',
            alternatives: [ 'all', 'normalized', 'api-versions', 'versioned' ],
            defaultValue: 'all',
      description: 'scope',
            required: false,
    });

    //TODO
    this._filter = this.defineStringParameter({
      parameterLongName: '--filter',
            argumentName: 'PATH_STRING_STDIN',
      parameterShortName: '-f',
      description: 'filter TODO',
            required: false,
    });

    this._show_docs = this. defineFlagParameter({
          parameterLongName: '--show-docs',
          parameterShortName: '-d',
          description: 'display docs',
          environmentVariable: 'ENV_DOCS'
        });
  }
}
