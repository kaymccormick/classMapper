import {namedTypes} from "ast-types/gen/namedTypes";
import { parse, print } from 'recast';
import { builders} from 'ast-types';
import {Collection, Map, List} from 'immutable';
import {NodePath} from "ast-types/lib/node-path";
import {SpecifierKind} from "ast-types/gen/kinds";

// @ts-ignore
module.exports = function (fileInfo, api, options) {
    const report = api.report;
    const j = api.jscodeshift;
    
    const c = j(fileInfo.source);

    const m = c.find(j.ImportDeclaration, (n: namedTypes.ImportDeclaration) => {
                return n.source.type === 'StringLiteral'
		&& n.source && n.source.value === 'typeorm'
 		&& n.specifiers });
    console.log(m.size());
    const map1: Map<string, string> = Map<string, string>(List.of<SpecifierKind>(...m
            .nodes()
	.flatMap((n: namedTypes.ImportDeclaration): SpecifierKind[] =>
	n.specifiers ))
            .map((specifier: SpecifierKind): string[] =>
                specifier.type === 'ImportSpecifier' &&
                specifier.imported && specifier.local ? [specifier.imported.name, specifier.local.name] : [])
        .filter(x => x.length));
	console.log(map1.toJS());
    let entityName = '';
    if(map1.has('Entity')) {
        entityName = map1.get('Entity');
    }
    const fileNode = c.nodes()[0];
    if(!map1.has('Entity')) {
      console.log('here');
        fileNode.program.body.splice(0, j.importDeclaration([j.importSpecifier(j.identifier('Entity'))], j.literal('typeorm')));
	}
    
    c.find(j.ImportDeclaration, (n) => n.importKind === 'value' && n.source.type === 'StringLiteral' && n.source.value === 'typeorm').forEach((p: NodePath) => {
        //console.log(p.value.type);
    });
    //    c.find(j.ClassDeclaration).forEach((p: NodePath) => {
    //      const classDecl = p.value;
    return print(c.nodes()[0]).code;
//    return c.toSource();
//    return api.jscodeshift(
//    return print(c.nodes()[0]).code;
}
