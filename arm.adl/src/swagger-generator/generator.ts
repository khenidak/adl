import * as adlruntime from '@azure-tools/adl.runtime'
import * as adltypes from '@azure-tools/adl.types'

// define types in ./swagger-generator-type.ts
// anything visible outside this module needs to be re-exported in ./module.ts
export class armSwaggerGenerator implements adlruntime.Generator{

    get description(): string{
        return "generates arm compliant swagger schema out of adl models";
    }

    private parseConfig(config: any): Map<string, string>{
        const configString = config as string;
        const values = new Map<string,string>();

        const parts = configString.split(",");
        for(const part of parts){
           const def = part.split("=");
           if(def.length != 2) throw new Error(`armSwaggerGenerator failed, configuration expected in form of 'key=val,key=val'`)
            values.set(def[0], def[1]);
        }

        return values;

    }
    // main entry point for generator. will be called when the user asks to run this specific generator either via cli=>runtime
    // or (whatever wraps runtime)=>runtime
    generate(apiManager:adlruntime.ApiManager, opts: adlruntime.apiProcessingOptions, config: any|undefined):void{
        // note the input is the entire api manager (not just one api-spec but all loaded in that manager)
        // that allows swagger to generate multiple spec/cross spec/any funcky stuff we want to do.
        // What can i do here?
        // answer: anything
        // config is passed in from cli (or whatever wrapps the runtime)
        // for example in our demo we are using x=y,a=c, etc..

         // first we validate that we can work with configuration
         if(config == undefined){
            throw new Error(`armSwaggerGenerator failed, expected configuration was not found`)
         }

        const configMap = this.parseConfig(config);

        // TODO: validate that you got minimum the mandotory keys you need

        // i can write to stderr from here using opts, which carries the same log level the user expects
        opts.logger.info(`armSwaggerGenerator got configuration ${configMap}`);
        // use varios logger functions to write what you need it supports err, info, warn, verbose (which is good for debugging).
        // keep in mind user may choose to supress all by setting log level to non.
        // if you want to force a write then use console.log family of function(highly unrecommended, because we later on use customized cli printers for output).
        // You are free to write to stdout or file.
        // go..
        console.log("ran arm swagger generator");
     }
}
