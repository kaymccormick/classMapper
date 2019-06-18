/**
 * Collection of handy but oddly specific routines
 */
import * as path from 'path';
import * as assert from 'assert';
import {Module} from "./Module";
import {Export} from "./Export";
import {Registry} from "./Registry";
import {PatternKind, StatementKind} from "ast-types/gen/kinds";
import {Declaration} from "@babel/types";
import {namedTypes} from "ast-types/gen/namedTypes";
import {NodePath} from "ast-types/lib/node-path";
const MethodDefinition = namedTypes.MethodDefinition;
import { Collection } from "jscodeshift/src/Collection";
export function handleImportDeclarations( collection: Collection<namedTypes.Node>, maxImport: number, relativeBase: string, thisModule: Module): void {
    const c = collection.find(namedTypes.ImportDeclaration);
    c.forEach((p, i) => {
        maxImport = Math.max(maxImport, i);
        const n = p.value;
        assert.strictEqual(n.importKind, 'value');
        assert.strictEqual(n.source.type, 'StringLiteral');
        const source = n.source.value;
        if(source == null) {
            throw new Error('source undefined or null');
        }
        if (/^\.\.?\//.test(source.toString())) {
            const importModule = path.resolve(relativeBase, source.toString());
            if(n.specifiers !== undefined) {
                n.specifiers.forEach(kind => {
                    if (kind.type === 'ImportSpecifier') {
                        assert.strictEqual(kind.imported.type, 'Identifier');
                        thisModule.addImport(kind.imported.name, importModule);
                        //imported[kind.imported.name] = [full, false];
                    } else if (kind.type === 'ImportDefaultSpecifier') {
                        const local = kind.local;
                        if(!local) {
                            throw new Error('kind..local is null');
                        }

                        thisModule.addImport(local.name, importModule, true);
                        //imported[local.name] = [full, true];
                    }
                });
            }
        } else {
            //report(source);
        }
    });
    //return imported;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ExportNamedDeclarationsResult {

}

export function processExportNamedDeclarations(collection: Collection<namedTypes.Node>,
    thisModule: Module):
    ExportNamedDeclarationsResult {
    const named = collection.find(namedTypes.ExportNamedDeclaration);
    const allSpecs = [];
    named.forEach((p: NodePath<namedTypes.Node>, i: number) => {
        const n = p.value;
        if(n.source) {
            throw new Error('unable to handle export from source');
        }
        if (n.declaration) {
            if(n.specifiers && n.specifiers.length > 0) {
                throw new Error('woah');
            }
            if (n.declaration.type === 'ClassDeclaration') {
                if (!n.declaration.id) {
                    throw new Error(n.declaration.type);
                }
                thisModule.addExport({ localName: n.declaration.id.name,
                    exportName: n.declaration.id.name});

                //thisModule.exported[n.declaration.id.name] = new Export(n.declaration.id.name);
                //;report(n.declaration.id.name);
            } else if (n.declaration.type === 'VariableDeclaration') {
            } else { // functiondeclaration and tsfunctiondeclaration
            }
        } else {
            if(n.specifiers) {
                allSpecs.push(n.specifiers);
                n.specifiers.forEach((sp1: namedTypes.Specifier) => {
                    if(sp1.type !== 'ExportSpecifier') {
                        throw new Error('expecting ExportSpecifier');
                    }
                    const sp = sp1 as namedTypes.ExportSpecifier;
                    if(sp.local) {
                        const local = sp.local.name;
                        const exported = sp.exported.name;
                        thisModule.addExport({
                            localName: local,
                            exportName: exported
                        });
                    }
                    //thisModule.exported[exported] = new Export(local, p);
                });
            }
        }
    });
    return {};
}

// @ts-ignore
export function processExportDefaultDeclaration(builders, collection, newExports, thisModule): void {

    // @ts-ignore
    collection.find(namedTypes.ExportDefaultDeclaration).forEach((p, i) => {
        const n = p.value;
        let name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            const export_ = builders.exportNamedDeclaration(null,
                [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
            newExports.push(export_);
        } else {
            name = n.declaration.name;
        }
        thisModule.defaultExport = name;
    });
}


// @ts-ignore
export function shiftExports(namedTypes, builders, collection, newExports, thisModule) {

    // @ts-ignore
    collection.find(namedTypes.ExportDefaultDeclaration).forEach((p, i) => {
        const n = p.value;
        let name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            const export_ = builders.exportNamedDeclaration(null, [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
            newExports.push(export_);
        } else {
            name = n.declaration.name;
        }
        thisModule.defaultExport = name;
    });
}

export function processClassDeclarations(collection: Collection<namedTypes.Node>, registry: Registry, thisModule: Module) {

    collection.find(namedTypes.ClassDeclaration).forEach((p: NodePath) => {
        const n = p.value;
        const classIdName = n.id.name;
        const theClass = thisModule.getClass(classIdName, true);
        assert.ok(theClass !== undefined);
        const super_ = n.superClass;
        let spec;
        let id;
        if (super_) {
            if (super_.type === 'MemberExpression') {
                const oname = super_.object.name;
                id = oname;
                const pname = super_.property.name;
                spec = [oname, pname];
            } else if (super_.type === 'Identifier') {
                spec = super_.name;
                id = spec;
            }

        }
        // @ts-ignore
        theClass.superSpec = spec;

        n.body.body.forEach((childNode: namedTypes.Declaration) => {
            if(childNode.type === 'MethodDefinition') {
                const methodDef = childNode as namedTypes.MethodDefinition;
                const kind = methodDef.kind;
                const key = methodDef.key;
                const value = methodDef.value;
                if(kind === "method") {
                    const methodName = value.id && value.id.name;
                    assert.ok(methodName);
                    const params = value.params;
                    params.forEach((pk: PatternKind) => {
                        console.log(pk.type);
                    })
                }

            }
        })

        thisModule.classes = thisModule.classes.set(classIdName, theClass);


    });
}
