import { appContext } from './appContext'
import * as adltypes from '@azure-tools/adl.types'


// our cli snaps to this version
export const DEFAULT_CLI_ADL_API_VERSION_NAME = "adl-v1";

// if errors has error(s), it will print and set exit code accordingly
export function printResultOrError(ctx: appContext, result: any, errors:adltypes.errorList, exit: boolean /*TODO: add printers*/):void{
    if(errors.length > 0){
        // TODO: when adl supports root array type, drop this and use errorList convertor
        const versioned_errorList = new Array<any>();
        for(const e of errors){
            const versioned_error = ctx.machinery.convertToVersioendError(e, DEFAULT_CLI_ADL_API_VERSION_NAME);
            versioned_errorList.push(versioned_error);
        }
        console.log(JSON.stringify(versioned_errorList));
        if(exit)
            process.exit(99);
        return;
     }

    console.log(JSON.stringify(result));
}

