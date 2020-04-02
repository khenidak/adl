import * as adlruntime from '@azure-tools/adl.runtime'

export class appContext {
    store: adlruntime.ApiManager; // actual store
    machinery: adlruntime.apiMachinery; // api design time. e.g. constraints system
    machineryRuntime: adlruntime.ApiRuntime; // api runtime implem entation e.g. normalize()/convert()
    opts: adlruntime.apiProcessingOptions;
}

