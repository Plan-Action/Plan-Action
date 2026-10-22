import {loadEnv} from 'vite';
import {writeFile,mkdir,cp} from 'node:fs/promises';
const env=loadEnv('production',process.cwd(),'VITE_NEON_');
const auth=new URL(env.VITE_NEON_AUTH_URL),data=new URL(env.VITE_NEON_DATA_API_URL);
if(auth.protocol!=='https:' || data.protocol!=='https:') throw new Error('HTTPS required');
const headers={
 'Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ${auth.origin} ${data.origin}; frame-src ${auth.origin}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
 'X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Strict-Transport-Security':'max-age=31536000','X-Robots-Tag':'noindex, nofollow',
};
await writeFile('dist/_headers','/*\n'+Object.entries(headers).map(([k,v])=>`  ${k}: ${v}`).join('\n'));
await mkdir('.vercel/output/static',{recursive:true});
await cp('dist','.vercel/output/static',{recursive:true});
await writeFile('.vercel/output/config.json',JSON.stringify({version:3,routes:[{src:'/(.*)',headers,continue:true},{handle:'filesystem'},{src:'/(.*)',dest:'/index.html'}]},null,2));
console.log('Built Neon-only Vercel SPA output');
