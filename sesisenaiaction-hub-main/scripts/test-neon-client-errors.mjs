import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

await mkdir('.vercel',{recursive:true});
await build({entryPoints:['src/integrations/neon/client.ts'],outfile:'.vercel/client-errors.mjs',bundle:true,platform:'node',format:'esm',define:{'import.meta.env.VITE_NEON_AUTH_URL':'"https://auth.example.test"','import.meta.env.VITE_NEON_DATA_API_URL':'"https://data.example.test"'},plugins:[{name:'isolated-auth',setup(b){
  b.onResolve({filter:/^@neondatabase\/auth$/},()=>({path:'auth',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export function createAuthClient(){const fail=async()=>{globalThis.fixtureCalls++;return {error:{message:'INTERNAL_SENTINEL database credentials'}}};return {signIn:{email:fail},admin:{createUser:fail},changePassword:fail};}`}));
}}]});
const {backend}=await import('../.vercel/client-errors.mjs');
globalThis.fixtureCalls=0;
test('login provider details do not reach application errors',async()=>{
  const result=await backend.auth.signInWithPassword({email:'test@example.test',password:'unused'});
  assert.ok(result.error);assert.doesNotMatch(result.error.message,/INTERNAL_SENTINEL|credentials/);
});
test('weak initial password never invokes provider',async()=>{
  const before=globalThis.fixtureCalls;
  const result=await backend.functions.invoke('create-user-account',{body:{user_password:'123'}});
  assert.ok(result.error);assert.equal(globalThis.fixtureCalls,before);
});
test('account creation errors are controlled',async()=>{
  const result=await backend.functions.invoke('create-user-account',{body:{user_password:'G7!tR9#vK2@pL8'}});
  assert.ok(result.error);assert.doesNotMatch(result.error.message,/INTERNAL_SENTINEL|credentials/);
});
test('password change errors are controlled',async()=>{
  const result=await backend.functions.invoke('complete-initial-password',{body:{new_password:'G7!tR9#vK2@pL8'}});
  assert.ok(result.error);assert.doesNotMatch(result.error.message,/INTERNAL_SENTINEL|credentials/);
});
