import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { passwordError, PASSWORD_HINT, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { toast } from "sonner";

export function InitialPassword() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = passwordError(password);
    if (error) return toast.error(error);
    if (password !== confirmation) return toast.error("A confirmação da senha não corresponde");
    if (password === current) return toast.error("Escolha uma senha diferente da senha inicial");
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("complete-initial-password", { body: { current_password: current, new_password: password } });
      if (error) { toast.error("Não foi possível trocar a senha. Verifique a senha atual e tente novamente."); return; }
      setCurrent(""); setPassword(""); setConfirmation("");
      await supabase.auth.signOut({ scope: "local" });
      toast.success("Senha pessoal definida. Entre novamente com a nova senha.");
      navigate("/auth", { replace: true });
    } catch { toast.error("Não foi possível trocar a senha. Tente novamente."); }
    finally { setLoading(false); }
  };
  return <main className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md">
      <CardHeader><img src="/S.png" alt="SESI SENAI" className="h-12 w-12" /><CardTitle>Defina sua senha pessoal</CardTitle><p className="text-sm text-muted-foreground">Troque a senha fornecida pelo Admin antes de acessar o sistema.</p></CardHeader>
      <CardContent><form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="initial-current">Senha inicial</Label><Input id="initial-current" autoComplete="current-password" type={show ? "text" : "password"} value={current} onChange={e=>setCurrent(e.target.value)} required disabled={loading} /></div>
        <div><Label htmlFor="initial-new">Nova senha</Label><Input id="initial-new" autoComplete="new-password" type={show ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={PASSWORD_MIN_LENGTH} required disabled={loading} aria-describedby="initial-hint" /><p id="initial-hint" className="text-xs text-muted-foreground">{PASSWORD_HINT}</p></div>
        <div><Label htmlFor="initial-confirm">Confirme a nova senha</Label><Input id="initial-confirm" autoComplete="new-password" type={show ? "text" : "password"} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={loading} /></div>
        <Button type="button" variant="ghost" onClick={()=>setShow(!show)} aria-pressed={show} disabled={loading}>{show ? "Ocultar senhas" : "Mostrar senhas"}</Button>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Salvar senha pessoal"}</Button>
        <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={async()=>{ await supabase.auth.signOut({scope:"local"}); navigate("/auth",{replace:true}); }}>Sair</Button>
      </form></CardContent>
    </Card>
  </main>;
}
