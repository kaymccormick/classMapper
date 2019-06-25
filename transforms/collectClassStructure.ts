import {
    handleImportDeclarations1,
    processClassDeclarations,
    processExportDefaultDeclaration,
    processExportNamedDeclarations,
    getModuleSpecifier,
} from "../src/transformUtils";
import {namedTypes} from "ast-types/gen/namedTypes";
import { builders} from 'ast-types';
import * as path from 'path';
import { ImportContext } from '../src/types';
import {API, FileInfo,Options} from "jscodeshift/src/core";
import {createRegistry} from "../src/Factory";
import core from "jscodeshift";
import {Module, Registry} from "classModel/lib/src";

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
function handleImportSpecifier(argument: any, importContext: ImportContext, importModuleName: string, localName?: string, exportedName?: string, isDefault?: boolean, isNamespace?: boolean): void
{
    const module = argument as Module;
    if(localName === undefined) {
        throw new Error('');
    }
    module.addImport(importModuleName, localName, exportedName, isDefault, isNamespace);
}

function getModuleName(fileInfo: core.FileInfo): string {
    const _f = path.resolve(fileInfo.path);
    //    const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');
    return moduleName;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function recordRun(fileInfo: core.FileInfo, api: core.API, options: core.Options): void {
//    console.log(fileInfo.path);
}

function getRegistry(): Registry {
    let registry: Registry | undefined = undefined;
    try {
        registry = createRegistry();
    } catch(error) {
        throw error;
    }
    if(registry === undefined) {
        throw new Error('registry undefined');
    }
    return registry;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports = function (fileInfo: FileInfo, api: API, options: Options): string {
    recordRun(fileInfo, api, options);
    const registry = getRegistry();
    const j = api.jscodeshift;
    /* parse source */
    const collection = j(fileInfo.source);
    /* fiddle with path to get module name */
    const moduleName = getModuleName(fileInfo);
    // our biz obj
    const moduleKey = registry.getModuleKey(moduleName);
    const module = registry.getModule(moduleKey, moduleName, true);
    if(module === undefined) {
        throw new Error('no module');
    }

    const context: ImportContext = {
        module: getModuleSpecifier(fileInfo.path),
    };
    handleImportDeclarations1(
        collection,
        moduleName,
        context,
        (importContext: ImportContext,
         importName: string,
         localName: string,
            exportedName?: string,
            isDefault?: boolean,
            isNamespace?: boolean): void => {
	    return handleImportSpecifier(
	    module,
	    importContext,
	    importName,
	    localName,
	    exportedName,
	    isDefault,
	    isNamespace);
	    });

    const newBody = [...collection.paths()[0].value.program.body];

    const newFile = j.file(j.program(newBody));
    const newExports: namedTypes.Node[] = [];

    processClassDeclarations(collection, registry, module);
    processExportNamedDeclarations(collection, module);
    processExportDefaultDeclaration(builders,
        collection, newExports, module);
    try {
        registry.save();
    } catch(error) {
        //        console.log(error.message);
    }
    return j(newFile).toSource();
};

