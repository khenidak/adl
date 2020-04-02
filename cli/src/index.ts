import { adlCliParser } from './commands'
import { appContext } from './appContext'



class app {
    static async main(): Promise<number> {
        // load store
        const appCtx: appContext = new appContext();
        const commandLine: adlCliParser = new adlCliParser(appCtx);
        commandLine.execute();
        return 0;
    }
}


// start here.
app.main();
