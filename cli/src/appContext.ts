import * as adlruntime from '@azure-tools/adl.runtime'

export class appContext {
    store: adlruntime.ApiManager; // actual store
    machinery: adlruntime.apiMachinery; // api design time. e.g. constraints system
    machineryRuntime: adlruntime.ApiRuntime; // api runtime implem entation e.g. normalize()/convert()
    opts: adlruntime.apiProcessingOptions;

    async init() : Promise<void>{
        this.store = new adlruntime.ApiManager();
        this.machinery = new adlruntime.apiMachinery();

        //TODO: for demo purposes, we are loading a sample
        // in a typical scneario, user will connect to rpaas
        // endpoint to load the data.
        this.opts = new adlruntime.apiProcessingOptions();
        await this.store.addApi(this.opts,
                                "sample_rp",
                                "/home/khenidak/go/src/github.com/khenidak/adl/sample_rp" );


        this.machineryRuntime = this.machinery.createRuntime(this.store, this.opts);
    }
}

