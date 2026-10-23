import {mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import './build.mjs';
const output='.vercel/output', fn=`${output}/functions/api/health.func`;
await mkdir(fn,{recursive:true});
await cp('dist',`${output}/static`,{recursive:true});
await cp('lib',`${fn}/lib`,{recursive:true});
await cp('node_modules/@neondatabase',`${fn}/node_modules/@neondatabase`,{recursive:true});
await cp('api/health.mjs',`${fn}/handler.mjs`);
let handler=await readFile(`${fn}/handler.mjs`,'utf8');
await writeFile(`${fn}/handler.mjs`,handler.replace("'../lib/probe.mjs'","'./lib/probe.mjs'"));
// Build Output functions use the native Node request/response objects.
await writeFile(`${fn}/index.mjs`,`import handler from './handler.mjs';\nexport default async function(req,res){res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};return handler(req,res);}\n`);
await writeFile(`${fn}/.vc-config.json`,JSON.stringify({runtime:'nodejs24.x',handler:'index.mjs',launcherType:'Nodejs',shouldAddHelpers:false}));
const config=JSON.parse(await readFile('vercel.json','utf8'));
await writeFile(`${output}/config.json`,JSON.stringify({version:3,routes:[{src:'/(.*)',headers:Object.fromEntries(config.headers[0].headers.map(x=>[x.key,x.value])),continue:true},{handle:'filesystem'}]},null,2));
console.log('Prepared self-contained Vercel Preview output');
