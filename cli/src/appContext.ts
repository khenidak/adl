import * as adlruntime from '@azure-tools/adl.runtime'

export class appContext {
    store: adlruntime.ApiManager; // actual store
    machinery: adlruntime.ApiMachinery; // api design time. e.g. constraints system
    machineryRuntime: adlruntime.ApiRuntime; // api runtime implementation e.g. normalize()/convert()
    opts: adlruntime.apiProcessingOptions;
}

