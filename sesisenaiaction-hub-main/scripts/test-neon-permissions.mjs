import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const auth='https://ep-aged-butterfly-b7oc9521.neonauth.c-13.us-east-1.aws.neon.tech/plan_action_test/auth';
const data='https://ep-aged-butterfly-b7oc9521.apirest.c-13.us-east-1.aws.neon.tech/plan_action_test/rest/v1';
const origin='https://plan-action-sesi-senai.vercel.app';
const root=JSON.parse(await readFile('.migration-session.local','utf8'));
const runId=Date.now();
const checks=[];
const users=JSON.parse(await readFile('.test-users.local','utf8').catch(()=>'[]'));
async function call(url,{body,cookie,token,method='POST'}={}){
 const options={method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})};
 let response=await fetch(url,options);
 for(let attempt=0;response.status===429 && attempt<3;attempt++) {
  const seconds=Number(response.headers.get('retry-after')||15);
  if(seconds>55)throw new Error('Rate limited. Resume after the provider retry period.');
  await new Promise(resolve=>setTimeout(resolve,Math.max(5,seconds)*1000));response=await fetch(url,options);
 }
 const json=await response.json().catch(()=>null);return {response,json};
}
const rpc=(name,body,session=root)=>call(`${data}/rpc/${name}`,{body,token:session.token});
async function login(user){
 const signed=await call(`${auth}/sign-in/email`,{body:{email:user.email,password:user.password}});
 assert.equal(signed.response.status,200,'login');
 const cookie=signed.response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 const jwt=await call(`${auth}/token`,{cookie,method:'GET'});assert.ok(jwt.json.token);return {cookie,token:jwt.json.token};
}
async function create(role,department){
 const previous=users.find(x=>x.role===role && x.department===department && x.session && x.password.startsWith('Personal!'));
 if(previous)return previous;
 const user={email:`test-${role}-${runId}-${users.length}@example.com`,name:`[TESTE] ${role}`,password:`Pa!${randomBytes(20).toString('hex')}9a`,role,department};
 const created=await call(`${auth}/admin/create-user`,{cookie:root.cookie,body:{email:user.email,name:user.name,password:user.password,role:'user'}});
 if(created.response.status!==200){console.error('Auth create failed',created.response.status,created.json?.code??created.json?.message);process.exit(1);}
 user.id=created.json.user.id;users.push(user);
 await writeFile('.test-users.local',JSON.stringify(users,null,2),{mode:0o600});
 const enrolled=await rpc('enroll_user',{target_user_id:user.id,full_name:user.name,user_role:role,user_department:department});
 assert.equal(enrolled.response.status,204,'enroll profile');
 user.session=await login(user);
 const initial=await rpc('profile_auth_state',{},user.session);assert.equal(initial.json.must_change_password,true,'initial password blocked');
 const newPassword=`Personal!${randomBytes(20).toString('hex')}9a`;
 const changed=await call(`${auth}/change-password`,{cookie:user.session.cookie,body:{currentPassword:user.password,newPassword,revokeOtherSessions:true}});
 assert.equal(changed.response.status,200,'password change');user.password=newPassword;
 await writeFile('.test-users.local',JSON.stringify(users,null,2),{mode:0o600});
 await call(`${auth}/sign-out`,{cookie:user.session.cookie,body:{}});
 user.session=await login(user);
 const ready=await rpc('password_setup_complete',{},user.session);assert.equal(ready.json,true,'personal password enables access');
 await writeFile('.test-users.local',JSON.stringify(users,null,2),{mode:0o600});return user;
}
const coordinator=await create('coordenador','Automação');checks.push('coordinator provisioning and mandatory password');
const teacher=await create('professor','Automação');checks.push('teacher provisioning and mandatory password');
const foreign=await create('professor','Mecânica');
const normalAdmin=await create('admin',null);
const details={title:`[TESTE] Migração Neon ${runId}`,description:'Registro fictício para homologação',objective:'Validar permissões',expected_result:'Teste de migração',where_location:'Laboratório de teste',how_to_execute:'Homologação automatizada',estimated_cost:0,start_date:'2026-10-22',end_date:'2026-10-30',status:'planning',priority:'medium',category:'ti',department:'Automação'};
const saved=await rpc('save_department_plan',{details,participant_ids:[teacher.id]},coordinator.session);
if(saved.response.status!==200) console.error('Save rejected',saved.json?.code,saved.json?.message);
assert.equal(saved.response.status,200,'coordinator save');const planId=saved.json;checks.push('coordinator creates plan atomically');
const own=await call(`${data}/action_plans?id=eq.${planId}`,{method:'GET',token:teacher.session.token});assert.equal(own.json.length,1);checks.push('assigned teacher can read');
const other=await call(`${data}/action_plans?id=eq.${planId}`,{method:'GET',token:foreign.session.token});assert.equal(other.json.length,0);checks.push('other department cannot read');
const edit=await call(`${data}/action_plans?id=eq.${planId}`,{method:'PATCH',token:teacher.session.token,body:{title:'Unauthorized'}});assert.ok(edit.response.status===204 || edit.response.status===403);
const unchanged=await call(`${data}/action_plans?id=eq.${planId}`,{method:'GET',token:root.token});assert.equal(unchanged.json[0].title,details.title);checks.push('teacher cannot edit');
const badTeam=await rpc('save_department_plan',{details:{...details,title:'Rejected cross-department'},participant_ids:[foreign.id]},coordinator.session);assert.ok(badTeam.response.status>=400);checks.push('cross-department assignment rolls back');
const normalCreate=await call(`${auth}/admin/create-user`,{cookie:normalAdmin.session.cookie,body:{email:`denied-${runId}@example.com`,name:'Denied',password:'DoNotUse!xyz987654321'}});assert.ok(normalCreate.response.status>=400);checks.push('normal admin cannot create users');
const deleteRoot=await rpc('deactivate_user',{target_user_id:'01b3d078-24d7-42a3-b4b0-c9fb14bb9e8d'},normalAdmin.session);assert.ok(deleteRoot.response.status>=400);checks.push('principal admin protected');
const forbidden=await rpc('deactivate_user',{target_user_id:normalAdmin.id},normalAdmin.session);assert.ok(forbidden.response.status>=400);checks.push('normal admin cannot remove admin/self');
const removed=await rpc('deactivate_user',{target_user_id:foreign.id},normalAdmin.session);assert.equal(removed.response.status,204);checks.push('normal admin removes teacher');
const disabled=await rpc('profile_auth_state',{},foreign.session);assert.equal(disabled.json.enrolled,false);checks.push('existing JWT loses app access after removal');
const changedPlan=await rpc('save_department_plan',{details:{...details,status:'completed'},participant_ids:[teacher.id],target_plan_id:planId},coordinator.session);assert.equal(changedPlan.response.status,200);checks.push('coordinator edits plan');
const anonym=await call(`${data}/action_plans`,{method:'GET'});assert.ok(anonym.response.status>=400);checks.push('anonymous access denied');
const rootVisible=await call(`${data}/profiles`,{method:'GET',token:root.token});assert.ok(rootVisible.json.some(x=>x.id===normalAdmin.id));checks.push('admin has global view');
await writeFile('neon/verification-results.json',JSON.stringify({date:'2026-10-22',checks,syntheticPlanId:planId,passed:true},null,2));
console.log(JSON.stringify({passed:true,checks}));
