const form=document.querySelector('#probe'), result=document.querySelector('#result');
form.addEventListener('submit',async event=>{
  event.preventDefault(); const button=form.querySelector('button'); button.disabled=true; result.textContent='Verificando…';
  try {
    const response=await fetch('/api/health',{headers:{Authorization:`Bearer ${document.querySelector('#token').value}`},cache:'no-store'});
    const body=await response.json();
    result.textContent=response.ok && body.syntheticRecordVerified ? 'Conexão validada. Registro fictício localizado no Neon.' : body.error || 'Falha na verificação.';
  } catch {result.textContent='Não foi possível acessar o serviço de teste.';}
  finally {button.disabled=false;}
});
