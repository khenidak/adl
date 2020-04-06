
import * as machinerytypes from './machinery.types'
import * as modeltypes from '../model/model.types'

import { api_machinery } from './machinery'
// main entry point
export function CreateMachinery(opts: modeltypes.apiProcessingOptions): machinerytypes.ApiMachinery{
    return new api_machinery(opts);
}
