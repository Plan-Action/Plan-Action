import {build} from 'esbuild';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const auth='https://ep-aged-butterfly-b7oc9521.neonauth.c-13.us-east-1.aws.neon.tech/plan_action_test/auth';
const data='https://ep-aged-butterfly-b7oc9521.apirest.c-13.us-east-1.aws.neon.tech/plan_action_test/rest/v1';
await mkdir('.vercel',{recursive:true});
await build({entryPoints:['src/integrations/neon/client.ts'],outfile:'.vercel/test-client.mjs',bundle:true,platform:'node',packages:'external',format:'esm',define:{'import.meta.env.VITE_NEON_AUTH_URL':JSON.stringify(auth),'import.meta.env.VITE_NEON_DATA_API_URL':JSON.stringify(data)}});
// Emulate the browser's origin-scoped HttpOnly cookie jar. Never log values.
const originalFetch=globalThis.fetch, jar=new Map();
globalThis.fetch=async(input,options={})=>{
 if(!String(input).startsWith(auth))return originalFetch(input,options);
 const headers=new Headers(options.headers);
 if(jar.size)headers.set('Cookie',[...jar.values()].join('; '));
 headers.set('Origin','https://plan-action-sesi-senai.vercel.app');
 const response=await originalFetch(input,{...options,headers});
 for(const cookie of response.headers.getSetCookie()) {const pair=cookie.split(';')[0];jar.set(pair.split('=')[0],pair);}
 return response;
};
try {
 const {backend}=await import('../.vercel/test-client.mjs');
 // Use a dedicated enrolled fixture, never the principal Admin's credentials.
 const credentials=JSON.parse(await readFile('.test-client-credentials.local','utf8'));
 const login=await backend.auth.signInWithPassword({email:credentials.email,password:credentials.password});
 assert.equal(login.error,null,'The application client must accept the valid Admin login');
 const session=await backend.auth.getSession();
 assert.equal(session.error,null);assert.equal(session.data.session?.user.email,credentials.email);
 assert.equal(session.data.session.user.app_metadata.must_change_password,credentials.mustChangePassword);
 const user=await backend.auth.getUser();assert.equal(user.data.user?.id,session.data.session.user.id);
 console.log(JSON.stringify({applicationClientLogin:true,sessionRestored:true,passwordStateVerified:true}));
}finally{globalThis.fetch=originalFetch;}
