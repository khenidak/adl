import { IndentationText, QuoteKind, Project } from 'ts-morph';
import { resolve, relative } from 'path';
import { readFile, isDirectory, isFile} from '@azure-tools/async-io';

import * as adltypes from '@azure-tools/adl.types';

import * as machinerytypes from './machinery.types'
import * as modeltypes from '../model/module'
// this is not the cleanst way to do that, we can think of something better
// the idea is to make each module as a stand alone as possible, only exporting module.ts
// to external world
import * as helpers from '../model/helpers';
import { api_model } from '../model/apiModel';

// api manager - aka store

const manipulationSettings = {
 indentationText: IndentationText.TwoSpaces,
 insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
 quoteKind: QuoteKind.Single,
};

// json parser that allow comments
function parseJsonc(text: string) {
    return JSON.parse(text.replace(/\/\*[\s\S]*?\*\//gm, '')
        .replace(/\s+\/\/.*/g, '')
        .replace(/],(\s*?)\}/gm, ']$1}')
        .replace(/},(\s*?)\}/gm, '}$1}'));
}

export class api_manager {
    private _apiModels = new Map<string, modeltypes.ApiModel>();

    get ApiModels(): Iterable<modeltypes.ApiModel> {
        var infos = new Array<modeltypes.ApiModel>();

        for(let [k,v] of this._apiModels)
            infos.push(v);

        return infos;
    }

    hasApiInfo(name: string): boolean{
        return this._apiModels.has(name);
    }

    getApiInfo(name: string): modeltypes.ApiModel | undefined{
        return this._apiModels.get(name);
    }

    constructor(private apimachinery: machinerytypes.ApiMachinery) {}


    async addApi(options:modeltypes.apiProcessingOptions, apiName: string, projectDirectory: string): Promise<adltypes.errorList>{
        const errors = new adltypes.errorList();

        const apiModel = await this.loadApi(options, errors, apiName, projectDirectory);

        // an error during load?
        if(!apiModel) return errors;

        this._apiModels.set(apiName, apiModel);
        return errors;
    }

    async loadApi(options: modeltypes.apiProcessingOptions, errors:adltypes.errorList, apiName: string, projectDirectory: string): Promise<modeltypes.ApiModel | undefined> {
        projectDirectory = resolve(projectDirectory);

        if (!isDirectory(projectDirectory)){
            const e = helpers.createLoadError(`Invalid Path ${projectDirectory} for ADL project`);
            errors.push(e);
            return undefined;
        }

        const configFile = resolve(projectDirectory, 'tsconfig.json');
            if (!isFile(configFile)) {
            const e = helpers.createLoadError(`No tsconfig at ${configFile}`);
            errors.push(e);
            return undefined;
        }

        const pkgFile = resolve(projectDirectory, 'package.json');
        if(!isFile(pkgFile)) {
            const e = helpers.createLoadError(`No packagejson at ${pkgFile}`);
                errors.push(e);
                return undefined;
        }

        const project = new Project({ tsConfigFilePath: configFile, manipulationSettings });
        const loadedFiles = new Set<string>();

        for (const each of project.getSourceFiles()) {
            const sourceFile = each.getFilePath();
            const content = await readFile(sourceFile);
            const rPath = relative(projectDirectory, sourceFile);
            loadedFiles.add(rPath);
            project.createSourceFile(rPath, content);
        }

        const apiModel = new api_model(apiName, projectDirectory, project, loadedFiles, this.apimachinery);

        apiModel.tsconfig = parseJsonc((await readFile(configFile)));
        apiModel.package = parseJsonc((await readFile(pkgFile)));

        const loaded = await apiModel.load(options, errors);
        if(!loaded) return undefined;

        return apiModel;
    }
}

