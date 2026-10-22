import {randomBytes} from 'node:crypto';
import {writeFile,access} from 'node:fs/promises';
const path='.admin-credentials.local';
try {await access(path);throw new Error('Credentials already exist; refusing to overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const base='https://ep-aged-butterfly-b7oc9521.neonauth.c-13.us-east-1.aws.neon.tech/plan_action_test/auth';
const email='administrador.plan@gmail.com', password=`Pa!${randomBytes(24).toString('base64url')}9a`;
const response=await fetch(`${base}/sign-up/email`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://plan-action-sesi-senai.vercel.app'},body:JSON.stringify({email,password,name:'Administrador'})});
const result=await response.json();
if(!response.ok || !result.user?.id) {console.error('Admin provisioning failed:',response.status,result.code??result.message??'unknown');process.exit(1);}
await writeFile(path,JSON.stringify({email,password,userId:result.user.id},null,2),{mode:0o600});
console.log(JSON.stringify({created:true,userId:result.user.id,credentialsFile:path}));
