import { getBuilderName, builders as b } from 'ast-types';
import { print } from 'recast';
import fs from 'fs';


const d = JSON.parse(fs.readFileSync(process.argv.length >= 3 ?process.argv[2] : 0, { encoding: 'utf-8' }));
// @ts-ignore
const file = b.file(b.program(d.map(x => b[getBuilderName(x.type)].from(x))))
file.comments = [b.commentBlock(' Generated by translate.ts ')]
//process.stdout.write(JSON.stringify(data))
process.stdout.write(print(file).code + "\n");
