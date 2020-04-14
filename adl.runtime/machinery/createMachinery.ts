import * as machinerytypes from './machinery.types'
import * as modeltypes from '../model/model.types'

import { api_machinery } from './machinery'
// main entry point
export async function CreateMachinery(opts: modeltypes.apiProcessingOptions): Promise<machinerytypes.ApiMachinery>{
    const machinery =  new api_machinery(opts);
    await machinery.init();
    return machinery;
}
