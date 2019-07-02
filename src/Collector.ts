import core from "jscodeshift";
import {createConnection} from "./TypeOrm/Factory";
import {ImportContext,ModuleSpecifier} from "./types";
import {TransformUtils} from "./transformUtils";
import {Module} from "../../classModel/lib/src";
import {EntityCore} from "classModel";
import {File,Node} from "ast-types/gen/nodes";
import {builders} from "ast-types";
import * as path from "path";
import j from 'jscodeshift';
import { Connection } from "typeorm";

export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}
function getModuleName(path1: string): string {
    const _f = path.resolve(path1);
    //    const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');
    return moduleName;
}

export function processSourceModule(connection: Connection, project: EntityCore.Project, path1: string, file: File): Promise<void> {
    const moduleName = getModuleName(path1);
    const moduleRepo = connection.getRepository(EntityCore.Module);

    const getOrCreateModule = (name: string): Promise<EntityCore.Module> => {
        if(!name) {
            throw new Error('name undefined');
        }
        // @ts-ignore
        return moduleRepo.find({project, name}).then(modules => {
            if(!modules.length) {
	    console.log(`saving new module with ${name}`);
                return moduleRepo.save(new EntityCore.Module(name, project, [], [], [])).catch(error => {
                    console.log('unable to create module');
                });
            } else {
                return modules[0];
            }
        });
    };

    const handleModule = (module: EntityCore.Module): Promise<void> => {
        const moduleName = module.name;
        const context: ImportContext = {
            module: getModuleSpecifier(path1),
        };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
        const handleImportSpecifier =
                (argument: any,
                    importContext: ImportContext,
                    importModuleName: string,
                    localName?: string,
                    exportedName?: string,
                    isDefault?: boolean,
                    isNamespace?: boolean): Promise<void> => {
                    const importRepo = connection.getRepository(EntityCore.Import);
                    const module = argument as EntityCore.Module;
                    if (localName === undefined) {
                        throw new Error('');
                    }

		    const import_ = new EntityCore.Import(module, localName, importModuleName, exportedName, isDefault, isNamespace);
		    return importRepo.save(import_).then(() => undefined).catch(error => {
		    console.log(`unable to create Import: ${error}`);
		    });
                };

        // @ts-ignore
        const collection = j(file);
        // const t = TransformUtils;
        // Object.keys(t).forEach(key => {
        // console.log(`key is ${key}`);
        // });
        return Promise.all([TransformUtils.handleImportDeclarations1(
            collection,
            moduleName,
            context,
            (importContext: ImportContext,
                importName: string,
                localName: string,
                exportedName?: string,
                isDefault?: boolean,
                isNamespace?: boolean): Promise<void> => {
                return handleImportSpecifier(
                    module,
                    importContext,
                    importName,
                    localName,
                    exportedName,
                    isDefault,
                    isNamespace);
            }), TransformUtils.processClassDeclarations(connection, module, collection)]).then(() => {});

        /*
        const newExports: Node[] = [];
            processClassDeclarations(collection, registry, module);
            processExportNamedDeclarations(collection, module);
            processExportDefaultDeclaration(builders,
                collection, newExports, module);
*/
    };
    return getOrCreateModule(moduleName).then(handleModule).catch(error => {
    		    console.log(`here1 ${error}`);
		    console.log(error);
    });
}
