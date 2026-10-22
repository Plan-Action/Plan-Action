import { createAuthClient } from '@neondatabase/auth';
import { PostgrestClient } from '@supabase/postgrest-js';
import type { Database } from '../supabase/types';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const dataUrl = import.meta.env.VITE_NEON_DATA_API_URL;
if (!authUrl || !dataUrl) throw new Error('Configure Neon Auth e Neon Data API neste ambiente.');
export const neonAuth = createAuthClient(authUrl);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
let cachedToken: {value:string; expires:number} | null = null;
let tokenFlight: Promise<string> | null = null;
const token = async () => {
  if(cachedToken && cachedToken.expires > Date.now()+30000) return cachedToken.value;
  if(tokenFlight) return tokenFlight;
  tokenFlight=(async()=>{
    // Use the provider's documented JWT endpoint with its HttpOnly session
    // cookie. The installed SDK's token helper can return no token after a
    // session read, despite a valid authenticated session.
    const response=await fetch(`${authUrl}/token`,{credentials:'include',cache:'no-store'});
    if(!response.ok) throw new Error('Sessão expirada. Entre novamente.');
    const result=await response.json();
    if(typeof result.token!=='string') throw new Error('Sessão expirada. Entre novamente.');
    const value=result.token;
    // Expiry only schedules refresh. Authorization is always verified by Neon.
    const claims=JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    cachedToken={value,expires:Number(claims.exp)*1000};return value;
  })();
  try{return await tokenFlight;}finally{tokenFlight=null;}
};
const dataClient = new PostgrestClient<Database>(dataUrl, {
  fetch: async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${await token()}`);
    return fetch(input, {...init, headers});
  },
});

async function getSession() {
  try {
    const result = await neonAuth.getSession({query:{}});
    if (result.error || !result.data?.user) return { data: {session: null}, error: result.error };
    let resultState = await dataClient.rpc('profile_auth_state' as never);
    let flags = resultState.data as {enrolled?: boolean; must_change_password?: boolean} | null;
    if(!resultState.error && !flags?.enrolled) {
      await new Promise(resolve=>setTimeout(resolve,350));
      resultState=await dataClient.rpc('profile_auth_state' as never);
      flags=resultState.data as typeof flags;
    }
    const error=resultState.error;
    if(error || !flags?.enrolled) return {data:{session:null},error:new Error('Acesso não cadastrado ou desativado. Solicite ao Admin.')};
    const user = {...result.data.user, app_metadata:{must_change_password:flags.must_change_password}};
    return { data: {session:{user,access_token:await token()}}, error:null };
  } catch { return {data:{session:null},error:new Error('Não foi possível verificar a sessão.')}; }
}

export const backend = {
  from: dataClient.from.bind(dataClient),
  rpc: dataClient.rpc.bind(dataClient) as typeof dataClient.rpc,
  auth: {
    getSession,
    getUser: async () => {const result=await getSession();return {data:{user:result.data.session?.user??null},error:result.error};},
    signInWithPassword: async ({email,password}:{email:string;password:string}) => {
      cachedToken=null;
      const result=await neonAuth.signIn.email({email,password});
      if(result.error) return result;
      const session=await getSession();
      if(session.error || !session.data.session){await neonAuth.signOut({});return {error:session.error??new Error('Acesso não cadastrado')};}
      notify();return {data:session.data,error:null};
    },
    signOut: async (_options?:unknown) => {const result=await neonAuth.signOut({});cachedToken=null;notify();return result;},
    updateUser: async (_attributes:unknown) => ({error:new Error('Use a troca de senha pessoal ou a recuperação de acesso.')}),
    onAuthStateChange: (listener:()=>void) => {listeners.add(listener);return {data:{subscription:{unsubscribe:()=>listeners.delete(listener)}}};},
  },
  functions: {
    invoke: async (name:string,{body}:{body:Record<string,unknown>}) => {
      try {
        if(name==='complete-initial-password') {
          const result=await neonAuth.changePassword({currentPassword:String(body.current_password),newPassword:String(body.new_password),revokeOtherSessions:true});
          if(result.error) return result;
          await neonAuth.signOut({});cachedToken=null;notify();return {data:{ok:true},error:null};
        }
        if(name==='create-user-account') {
          const result=await neonAuth.admin.createUser({email:String(body.user_email),password:String(body.user_password),name:String(body.user_full_name),role:'user'});
          if(result.error || !result.data?.user) return {data:null,error:result.error??new Error('Não foi possível criar o acesso')};
          const enrolled=await dataClient.rpc('enroll_user' as never, {target_user_id:result.data.user.id,full_name:body.user_full_name,user_role:body.user_role,user_department:body.user_role==='admin'?null:body.user_department} as never);
          if(enrolled.error) return enrolled;
          return {data:{ok:true},error:null};
        }
        if(name==='delete-user-completely') return await dataClient.rpc('deactivate_user' as never,{target_user_id:body.user_id} as never);
        return {data:null,error:new Error('Operação não disponível')};
      } catch {return {data:null,error:new Error('Não foi possível concluir a operação. Confira sua sessão e permissão.')};}
    },
  },
};
