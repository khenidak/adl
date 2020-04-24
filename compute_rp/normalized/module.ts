// core adl type system
import * as adltypes from "@azure-tools/adl.types";

// my api defs.
import { VirtualMachineScaleSetNormalized } from "./vmscalesets";

// normalized resources
export type VMSSNormalized = adltypes.NormalizedApiType<"vmscalesets", VirtualMachineScaleSetNormalized>;

// export properties so versioned decleration can see it
export * from "./vmscalesets";
