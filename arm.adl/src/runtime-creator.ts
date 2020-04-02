import * as adlruntime from '@azure-tools/adl.runtime'

// we load runtime into adl runtime. to supply adl runtime withour generators
// normalizers etc..
export const ARM_RUNTIME_NAME= "arm";

export class RuntimeCreator implements adlruntime.RuntimeCreator{
    construcor(){}
    Create(config: any | undefined): adlruntime.machineryLoadableRuntime{
    return new adlruntime.machineryLoadableRuntime(ARM_RUNTIME_NAME);
    }
}

