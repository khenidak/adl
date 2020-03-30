import { adlCliParser } from './commands'
import { appContext } from './appContext'



class app {
    static async main(): Promise<number> {
/*
 if we don't need module then we need to stop importing
 node types
        console.log(module)


        File (ts) that has the types
        name of the type i want = Person

version = await import(file:string); //
version["person"]

        const person: adltypes.Normalized; // normalized is an empty interfaxe

        jsonString = deserialze as person //

const normalizer = version["userNormalizer"] as adltype.Normalizer

*/
        // load store
        const appCtx: appContext = new appContext();
        await appCtx.init();

        const commandLine: adlCliParser = new adlCliParser(appCtx);
        commandLine.execute();
        return 0;
    }
}


// start here.
app.main();
