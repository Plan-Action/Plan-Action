import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['index.html','app.js','style.css','S.png']) await copyFile(`public/${name}`,`dist/${name}`);
console.log('Built isolated Neon connectivity page');
