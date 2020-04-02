import * as adlruntime from '@azure-tools/adl.runtime'

// import swagger gen here
import * as armSwaggerGen from './swagger-generator/module'
// we load runtime into adl runtime. to supply adl runtime withour generators
// normalizers etc..
export const ARM_RUNTIME_NAME= "arm";

export class RuntimeCreator implements adlruntime.RuntimeCreator{
    construcor(){}
    Create(config: any | undefined): adlruntime.machineryLoadableRuntime{
        const runtimeDef =  new adlruntime.machineryLoadableRuntime(ARM_RUNTIME_NAME);
        // add swagger generator
        runtimeDef.generators.set("arm.swagger", new armSwaggerGen.armSwaggerGenerator());

        return runtimeDef;
    }
}

