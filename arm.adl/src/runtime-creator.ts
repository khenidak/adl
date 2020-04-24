import * as adlruntime from '@azure-tools/adl.runtime'
import * as adltypes from '@azure-tools/adl.types'
// import swagger gen here
import * as armOpenApiGen from './swagger-generator/module'
import * as armtypes from './types'

import * as armconformance from './conformance_rules'
// we load runtime into adl runtime. to supply adl runtime withour generators
// normalizers etc..
export const ARM_RUNTIME_NAME= "arm";

export class RuntimeCreator implements adlruntime.RuntimeCreator{
    construcor(){}
    Create(config: any | undefined): adlruntime.machineryLoadableRuntime{
        const runtimeDef =  new adlruntime.machineryLoadableRuntime(ARM_RUNTIME_NAME);
        // add openapi generator
        runtimeDef.generators.set("arm.openapi", new armOpenApiGen.armOpenApiGenerator());

        // add arm specific conformance rules
        runtimeDef.conformanceRules.set('arm:shape_conformance', new armconformance.shapeConformer());
        return runtimeDef;
    }
}

