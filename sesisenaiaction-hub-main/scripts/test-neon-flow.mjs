import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const auth='https://ep-aged-butterfly-b7oc9521.neonauth.c-13.us-east-1.aws.neon.tech/plan_action_test/auth';
const data='https://ep-aged-butterfly-b7oc9521.apirest.c-13.us-east-1.aws.neon.tech/plan_action_test/rest/v1';
const origin='https://plan-action-sesi-senai.vercel.app';
const account=JSON.parse(await readFile('.admin-credentials.local','utf8'));
const login=await fetch(`${auth}/sign-in/email`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})});
const signed=await login.json();
if(!login.ok) {console.error('Sign-in failed',login.status,signed.code??signed.message);process.exit(1);}
const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
const tokenResponse=await fetch(`${auth}/token`,{headers:{Origin:origin,Cookie:cookie}});
const jwt=await tokenResponse.json();
if(!jwt.token) {console.error('JWT failed',tokenResponse.status,Object.keys(jwt));process.exit(1);}
await writeFile('.migration-session.local',JSON.stringify({cookie,token:jwt.token}),{mode:0o600});
const state=await fetch(`${data}/rpc/profile_auth_state`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${jwt.token}`},body:'{}'});
const profile=await state.json();
console.log(JSON.stringify({signIn:login.status,token:tokenResponse.status,profileStatus:state.status,profile}));
assert.equal(state.status,200);assert.equal(profile.enrolled,true);
