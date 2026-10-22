import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";

export function RequirePersonalPassword({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<"loading" | "login" | "password" | "allowed">("loading");
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user?.app_metadata.initial_password_changed_at && user.app_metadata.must_change_password !== true) {
        const { data: ready, error: setupError } = await supabase.rpc("password_setup_complete");
        if (active && (setupError || ready !== true)) { setAccess("login"); return; }
      }
      if (active) setAccess(error || !user ? "login" : user.app_metadata.must_change_password === true ? "password" : "allowed");
    };
    void check();
    let timer: ReturnType<typeof setTimeout>;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      clearTimeout(timer); timer = setTimeout(() => { void check(); }, 0);
    });
    return () => { active = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, []);
  if (access === "loading") return <p role="status" className="p-6">Verificando acesso...</p>;
  if (access === "login") return <Navigate to="/auth" replace />;
  if (access === "password") return <Navigate to="/auth?initial=1" replace />;
  return children;
}
