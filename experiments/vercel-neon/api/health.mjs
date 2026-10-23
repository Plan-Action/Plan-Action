import {authorized,readProbe} from '../lib/probe.mjs';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET') {res.setHeader('Allow','GET'); return res.status(405).json({ok:false});}
  if(process.env.MIGRATION_TEST_ENABLED !== 'true') return res.status(503).json({ok:false,error:'Teste desativado'});
  if(!authorized(req.headers.authorization,process.env.PROBE_TOKEN)) return res.status(401).json({ok:false,error:'Acesso não autorizado'});
  try {return res.status(200).json(await readProbe(process.env.DATABASE_URL));}
  catch {return res.status(503).json({ok:false,error:'Não foi possível validar a conexão de teste'});}
}
