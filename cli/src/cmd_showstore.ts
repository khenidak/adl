import { CommandLineAction, CommandLineChoiceParameter, CommandLineFlagParameter, CommandLineStringListParameter, CommandLineStringParameter } from '@microsoft/ts-command-line'
import { appContext } from './appContext'

import * as adlruntime from '@azure-tools/adl.runtime'

/* shows what is in store
 * in a runtime env, this will connect to rpaas api server
 * and use it as a store, to red api definitions from
 */


export class showStoreAction extends CommandLineAction {
	private _scope: CommandLineChoiceParameter;
	private _filter: CommandLineStringParameter;

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
	private printModel(scope: string, model: adlruntime.ApiModel):void{
		// Print api model name
		var prefix = "";
		console.log(`${prefix} Api Model: ${model.Name}`);
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
			// properties
			for(const prop  of normalizedType.Properties){
				prefix = "    ";
				if(!prop.isRemoved){
					console.log(`${prefix} Property:${prop.Name}(${prop.DataTypeName}/${prop.AliasDataTypeName}) ${this.getPropertiesConstraintsAsText(prop)}`);
				}
			}
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

			console.log(`${prefix} Type:${versionedType.Name} ${constraintsAsText}`)
			// properties
			for(const prop  of versionedType.Properties){
				prefix = "     ";
				if(!prop.isRemoved)
					console.log(`${prefix} Property:${prop.Name}(${prop.DataTypeName}/${prop.AliasDataTypeName}) ${this.getPropertiesConstraintsAsText(prop)}`);
			}
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

		//todo
		this._filter = this.defineStringParameter({
      parameterLongName: '--filter',
			argumentName: 'PATH_STRING_STDIN',
      parameterShortName: '-f',
      description: 'filter TODO',
			required: false,
    });
  }
}
