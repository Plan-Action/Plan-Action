import { ReactNode, useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { ChevronDown, LogOut, Menu, Moon, Sun, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { AccessibilityButton } from "@/components/AccessibilityButton";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [principalAdmin, setPrincipalAdmin] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let active = true;
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from("profiles")
        .select("full_name, role, is_absolute_admin").eq("id", session.user.id).single();
      if (active && profile) {
        setUserName(profile.full_name);
        setUserRole(profile.role);
        setPrincipalAdmin(profile.is_absolute_admin);
      }
    };
    getUserData();
    return () => { active = false; };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Erro ao sair");
    else navigate("/auth");
  };
  const menuItems = [
    { label: "Visão geral", path: "/dashboard" },
    { label: "Planos de ação", path: "/plans" },
    { label: "Usuários", path: "/users" },
    { label: "Suporte", path: "/support" },
  ];
  const roleLabel = principalAdmin ? "Admin" : ({ admin: "Administrador", coordenador: "Coordenador", professor: "Professor" }[userRole] || "Minha conta");

  return (
    <div className="min-h-screen w-full bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[60] focus:bg-card focus:p-3 focus:text-primary">Ir para o conteúdo</a>
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-3" aria-label="SESI SENAI — Visão geral">
            <img src="/S.png" alt="SESI SENAI" className="h-11 w-11 object-contain bg-white" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold tracking-wide">SESI SENAI</p>
              <p className="text-xs text-muted-foreground">Planos de ação</p>
            </div>
          </Link>
          <nav aria-label="Navegação principal" className="hidden self-stretch lg:flex lg:items-stretch lg:gap-6">
            {menuItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => cn("flex items-center border-b-2 px-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring", isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <AccessibilityButton sidebarOpen={false} placement="header" />
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto gap-2 px-2 py-2 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground" aria-label="Menu da conta">
                  <User className="h-5 w-5 shrink-0" />
                  <span className="hidden max-w-40 text-left sm:block">
                    <span className="block truncate text-sm font-medium">{userName || "Minha conta"}</span>
                    <span className="block text-xs font-normal text-black dark:text-white">{roleLabel}</span>
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{userName || "Minha conta"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/account")}><User className="mr-2 h-4 w-4" />Minha conta</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {menuOpen && <nav id="mobile-navigation" aria-label="Navegação principal no celular" className="grid grid-cols-2 gap-1 border-t border-border p-3 lg:hidden">
          {menuItems.map((item) => <NavLink key={item.path} to={item.path} onClick={() => setMenuOpen(false)} className={({ isActive }) => cn("border-l-2 px-3 py-3 text-sm font-medium", isActive ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-muted")}>{item.label}</NavLink>)}
        </nav>}
      </header>
      <main id="main-content" className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
