import {timingSafeEqual} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

export function authorized(header, secret) {
  if(!secret || secret.length < 32 || typeof header !== 'string') return false;
  const actual=Buffer.from(header), expected=Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}

export async function readProbe(url) {
  const parsed=new URL(url);
  if(!parsed.hostname.endsWith('.neon.tech') || parsed.pathname !== '/plan_action_test') throw new Error('Unexpected test database');
  const sql=neon(url);
  const rows=await sql`SELECT id, label FROM public.migration_probe WHERE id = '8aa83f1f-9c35-46b8-a456-193bd6e5960b'::uuid AND label = 'synthetic-connectivity-test'`;
  if(rows.length !== 1) throw new Error('Probe record missing');
  return {ok:true,environment:'migration-test',database:'Neon',syntheticRecordVerified:true};
}
