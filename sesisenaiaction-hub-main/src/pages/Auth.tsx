import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { InitialPassword } from "@/components/InitialPassword";
import { passwordError, PASSWORD_MIN_LENGTH, PASSWORD_HINT } from "@/lib/password-policy";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [invite] = useState(() => new URLSearchParams(window.location.search).get("invite") === "1" || new URLSearchParams(window.location.hash.slice(1)).get("type") === "invite");
  const [inviteSession, setInviteSession] = useState(false);
  const initial = new URLSearchParams(window.location.search).get("initial") === "1";

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user?.app_metadata.initial_password_changed_at && user.app_metadata.must_change_password !== true) {
        const { data: ready, error } = await supabase.rpc("password_setup_complete");
        if (!active || error) return;
        if (ready !== true) { await supabase.auth.signOut({ scope: "local" }); return; }
      }
      if (user?.app_metadata.must_change_password === true) {
        if (!initial) navigate("/auth?initial=1", { replace: true });
      } else if (initial) navigate("/auth", { replace: true });
      else if (invite) setInviteSession(Boolean(user));
      else if (user) navigate("/dashboard", { replace: true });
    };
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      clearTimeout(timer); timer = setTimeout(() => { void check(); }, 0);
    });
    return () => { active = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, [navigate, invite, initial]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invite) {
      if (!inviteSession) { toast.error("Abra um convite válido enviado pelo administrador"); return; }
      const policyError = passwordError(password);
      if (policyError || password !== confirmation) { toast.error(policyError || "Confirme a mesma senha"); return; }
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) toast.error("Não foi possível definir a senha. Abra um convite válido e tente novamente.");
      else { toast.success("Senha definida. Bem-vindo!"); navigate("/dashboard", { replace: true }); }
      return;
    }
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error("Email ou senha incorretos");
    }
  };

  if (initial) return <InitialPassword />;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-glow">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white overflow-hidden">
            <img src="/S.png" alt="SENAI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">SESI SENAI</CardTitle>
            <CardDescription>Sistema de Gestão de Planos de Ação</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
                {!invite && <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="seu.email@sesisenai.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>}
                {invite && <p className="text-sm text-muted-foreground">{inviteSession ? "Defina sua senha para concluir o convite." : "Abra o link do convite enviado pelo Admin para ativar seu acesso."}</p>}
                <div className="space-y-2">
                  <Label htmlFor="password-login">Senha</Label>
                  <Input
                    id="password-login"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {invite && <div className="space-y-2">
                  <Label htmlFor="password-confirm">Confirme a senha</Label>
                  <Input id="password-confirm" type={showPassword ? "text" : "password"} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={loading} minLength={PASSWORD_MIN_LENGTH} />
                  <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
                </div>}
                <Button type="button" variant="ghost" size="sm" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                  {showPassword ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {showPassword ? "Ocultar senha" : "Mostrar senha"}
                </Button>
                <Button type="submit" className="w-full" disabled={loading || (invite && !inviteSession)}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {invite ? "Salvando..." : "Entrando..."}
                    </>
                  ) : (
                    invite ? "Definir senha e entrar" : "Entrar"
                  )}
                </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
