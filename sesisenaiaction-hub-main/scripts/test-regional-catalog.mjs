import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.PGLITE_MODULE || '.vercel/permission-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);

test('regional catalog permissions and historical integrity', async t => {
  const db = new PGlite();
  const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
  const admin = id(1), coordinator = id(2), second = id(3), outsider = id(4), teacher = id(5);
  try {
    await db.exec(`CREATE ROLE anonymous;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA neon_auth;
      CREATE TABLE neon_auth.user(id uuid PRIMARY KEY,email text,role text,banned boolean DEFAULT false);
      CREATE TABLE neon_auth.account("userId" uuid,"providerId" text,password text,"updatedAt" timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.session() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT '{}'::jsonb$$;
      GRANT USAGE ON SCHEMA public,auth TO anonymous,authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid(),auth.session() TO authenticated;`);
    for (const name of ['001_application.sql','002_save_plan.sql','003_identity_and_admin_guard.sql','004_optional_cost.sql','005_regional_catalog.sql']) await db.exec(await readFile(`neon/${name}`,'utf8'));
    for (const [who,role,department] of [[admin,'admin',null],[coordinator,'coordenador','Educação'],[second,'coordenador','Educação'],[outsider,'coordenador','TI'],[teacher,'professor','Educação']]) {
      // TI is deliberately a separate department fixture.
      if (department==='TI') await db.exec("INSERT INTO public.departments VALUES ('TI') ON CONFLICT DO NOTHING");
      await db.query('INSERT INTO neon_auth.user(id,email,role) VALUES($1,$2,$3)',[who,`${who}@example.test`,'user']);
      await db.query('INSERT INTO public.profiles(id,full_name,email,role,department) VALUES($1,$2,$3,$4,$5)',[who,role,`${who}@example.test`,role,department]);
    }
    async function as(who,query,args=[]) {
      await db.query("SELECT set_config('request.sub',$1,false)",[who]);await db.exec('SET ROLE authenticated');
      try {return await db.query(query,args);} finally {await db.exec('RESET ROLE');}
    }
    const save = async(kind,details,who=admin) => (await as(who,'SELECT public.save_regional_entry($1,$2::jsonb) AS id',[kind,JSON.stringify(details)])).rows[0].id;
    let course,offering,klass,assignment,plan;
    const units = (await db.query('SELECT * FROM public.regional_units ORDER BY name')).rows;
    await t.test('seeds only the four confirmed units',()=>assert.deepEqual(units.map(u=>u.name),['Blumenau','Indaial','Pomerode','Timbó']));
    await t.test('anonymous cannot read catalogs',async()=>{await db.exec('SET ROLE anonymous');try{await assert.rejects(db.query('SELECT * FROM public.regional_units'));}finally{await db.exec('RESET ROLE');}});
    await t.test('coordinator cannot maintain catalog through direct RPC',async()=>{await assert.rejects(save('course',{name:'Unauthorized'},coordinator));});
    await t.test('normal authenticated user cannot mutate table directly',async()=>{await assert.rejects(as(admin,"INSERT INTO public.regional_courses(name) VALUES('Bypass')"));});
    await t.test('one course can exist in multiple units without duplication',async()=>{
      course=await save('course',{name:'Curso de teste'});
      offering=await save('offering',{unit_id:units[0].id,course_id:course});
      await save('offering',{unit_id:units[1].id,course_id:course});
      assert.equal((await db.query('SELECT count(*)::int AS n FROM public.regional_courses')).rows[0].n,1);
      await assert.rejects(save('course',{name:'  CURSO DE TESTE  '}));
    });
    await t.test('class and multiple supervisors use explicit department-compatible links',async()=>{
      klass=await save('class',{name:'Turma de teste',code:'T-01',offering_id:offering,department:'Educação'});
      assignment=await save('supervisor',{class_id:klass,profile_id:coordinator});
      await save('supervisor',{class_id:klass,profile_id:second});
      await assert.rejects(save('supervisor',{class_id:klass,profile_id:outsider}));
      await assert.rejects(save('supervisor',{class_id:klass,profile_id:teacher}));
    });
    await t.test('foreign department cannot read class, unit or course through catalog RPC',async()=>{
      const value=(await as(outsider,'SELECT public.regional_catalog() AS value')).rows[0].value;
      for(const key of ['units','courses','classes','offerings','supervisors'])assert.equal(value[key].length,0);
      assert.equal((await as(coordinator,'SELECT public.regional_catalog() AS value')).rows[0].value.classes.length,1);
    });
    const details={title:'Plano de teste',description:'Teste',objective:'Teste',expected_result:'Teste',where_location:'Local',how_to_execute:'Etapas',estimated_cost:0,start_date:'2026-10-01',end_date:'2026-11-01',status:'planning',priority:'medium',category:null,department:'Educação',class_id:klass};
    await t.test('plan class is saved atomically and invalid link rolls back the plan',async()=>{
      details.class_id=klass;
      plan=(await as(coordinator,'SELECT public.save_department_plan($1::jsonb,$2::uuid[]) AS id',[JSON.stringify(details),[]])).rows[0].id;
      assert.equal((await db.query('SELECT class_id FROM public.action_plans WHERE id=$1',[plan])).rows[0].class_id,klass);
      const before=(await db.query('SELECT count(*)::int AS n FROM public.action_plans')).rows[0].n;
      await assert.rejects(as(outsider,'SELECT public.save_department_plan($1::jsonb,$2::uuid[])',[JSON.stringify({...details,department:'TI'}),[]]));
      assert.equal((await db.query('SELECT count(*)::int AS n FROM public.action_plans')).rows[0].n,before);
    });
    await t.test('archiving preserves existing plan context and blocks new assignments',async()=>{
      await save('class',{id:klass,enabled:false});
      await as(coordinator,'SELECT public.save_department_plan($1::jsonb,$2::uuid[],$3::uuid)',[JSON.stringify({...details,class_id:klass}),[],plan]);
      await assert.rejects(as(coordinator,'SELECT public.save_department_plan($1::jsonb,$2::uuid[])',[JSON.stringify({...details,class_id:klass}),[]]));
      assert.equal((await db.query('SELECT class_id FROM public.action_plans WHERE id=$1',[plan])).rows[0].class_id,klass);
      await save('supervisor',{id:assignment,enabled:false});
      assert.equal((await db.query('SELECT count(*)::int AS n FROM public.regional_supervisors')).rows[0].n,2);
    });
    await t.test('supervisor reactivation validates stored link, ignoring spoofed payload',async()=>{
      await save('class',{id:klass,enabled:true});
      await db.query('UPDATE public.profiles SET enabled=false WHERE id=$1',[coordinator]);
      await assert.rejects(save('supervisor',{id:assignment,enabled:true,class_id:klass,profile_id:second}));
      assert.equal((await db.query('SELECT profile_name FROM public.regional_supervisors WHERE id=$1',[assignment])).rows[0].profile_name,'coordenador');
    });
    await t.test('plans without a class remain valid and are never backfilled',async()=>{
      const result=await as(admin,'SELECT public.save_department_plan($1::jsonb,$2::uuid[]) AS id',[JSON.stringify({...details,class_id:null}),[]]);
      assert.equal((await db.query('SELECT class_id FROM public.action_plans WHERE id=$1',[result.rows[0].id])).rows[0].class_id,null);
    });
  } finally { await db.close(); }
});
