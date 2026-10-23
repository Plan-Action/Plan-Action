import { passwordError, PASSWORD_HINT, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Mail, Briefcase, Trash2, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


import { useDepartments } from "@/hooks/use-departments";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_absolute_admin: boolean;
  department: string | null;
}

async function getFunctionErrorMessage(error: unknown) {

  return error instanceof Error ? error.message : "Ocorreu um erro inesperado";
}

export default function Users() {
  const navigate = useNavigate();
  const departments = useDepartments();
  const [savingDepartment, setSavingDepartment] = useState<string | null>(null);
  const [professors, setProfessors] = useState<UserProfile[]>([]);
  const [filteredProfessors, setFilteredProfessors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [canDeleteUsers, setCanDeleteUsers] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "professor",
    department: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);
      const { data: callerProfile, error: roleError } = await supabase
        .from("profiles").select("role,is_absolute_admin").eq("id", session.user.id).single();
      if (roleError || !callerProfile) {
        navigate("/dashboard");
        return;
      }
      setCanDeleteUsers(callerProfile.role === "admin");
      setIsAdmin(callerProfile.role === "admin" && callerProfile.is_absolute_admin);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (data) {
        setProfessors(data);
        setFilteredProfessors(data);
      }
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const setDepartment = async (userId: string, department: string) => {
    setSavingDepartment(userId);
    const { error } = await supabase.rpc("set_user_department", { target_user_id: userId, new_department: department });
    if (error) toast.error(error.message);
    else {
      setProfessors((current) => current.map((user) => user.id === userId ? { ...user, department } : user));
      toast.success("Departamento atualizado");
    }
    setSavingDepartment(null);
  };

  useEffect(() => {
    const normalizedSearch = search.toLowerCase();
    const normalizedRole = roleFilter === "all" ? null : roleFilter;

    setFilteredProfessors(
      professors.filter((prof) => {
        const matchesSearch = normalizedSearch
          ? prof.full_name.toLowerCase().includes(normalizedSearch) ||
            prof.email.toLowerCase().includes(normalizedSearch) ||
            (prof.department && prof.department.toLowerCase().includes(normalizedSearch))
          : true;

        const matchesRole = normalizedRole ? prof.role === normalizedRole : true;

        return matchesSearch && matchesRole;
      })
    );
  }, [search, roleFilter, professors]);


  const getRoleLabel = (role: string) => {
    const labels = {
      admin: "Administrador",
      coordenador: "Coordenador",
      professor: "Professor",
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: "bg-destructive",
      coordenador: "bg-primary",
      professor: "bg-secondary",
    };
    return colors[role as keyof typeof colors] || "bg-muted";
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!canDeleteUsers) {
      toast.error("Apenas administradores podem excluir usuários");
      return;
    }

    setDeletingId(userId);
    try {
      // Verificar se o usuário não está tentando excluir a si mesmo
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id === userId) {
        toast.error("Você não pode excluir seu próprio acesso!");
        setDeletingId(null);
        return;
      }

      // A Edge Function usa a API administrativa do Supabase Auth no servidor.
      const { error } = await supabase.functions.invoke("delete-user-completely", {
        body: { user_id: userId },
      });

      if (error) {
        throw error;
      }

      // Atualizar a lista de professores
      setProfessors(professors.filter((p) => p.id !== userId));
      setFilteredProfessors(filteredProfessors.filter((p) => p.id !== userId));
      
      toast.success(`Usuário ${userName} removido do acesso ao sistema!`);
    } catch (error: unknown) {
      console.error("Erro capturado:", error);
      toast.error(await getFunctionErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newUser.fullName || !newUser.email || (newUser.role !== "admin" && !newUser.department)) {
      toast.error("Preencha nome, email e departamento");
      return;
    }

    setCreating(true);
    if (passwordError(newUser.password)) {
      toast.error(passwordError(newUser.password)!);
      setCreating(false);
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("create-user-account", {
        body: {
          user_email: newUser.email,
          user_password: newUser.password,
          user_full_name: newUser.fullName,
          user_role: newUser.role,
          user_department: newUser.department || null,
        },
      });

      if (error) throw error;

      toast.success("Usuário cadastrado. O envio de email ainda não está configurado.");
      setNewUser({ fullName: "", email: "", password: "", role: "professor", department: "" });
      setShowNewPassword(false);
      const { data } = await supabase.from("profiles").select("*").order("full_name");
      if (data) setProfessors(data);
    } catch (error: unknown) {
      console.error("Erro ao cadastrar usuário:", error);
      toast.error(await getFunctionErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">{canDeleteUsers ? "Visualize todos os usuários do sistema" : "Visualize os usuários do seu departamento"}</p>
          </div>
          {isAdmin && (
            <Dialog onOpenChange={(open) => { if (!open) { setNewUser((current) => ({ ...current, password: "" })); setShowNewPassword(false); } }}>
              <DialogTrigger asChild>
                <Button>Convidar usuário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar usuário</DialogTitle>
                  <DialogDescription>Cadastre professor, coordenador ou administrador com uma senha inicial. O envio automático de email ainda não está configurado.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-user-name">Nome completo</Label>
                    <Input id="new-user-name" value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} disabled={creating} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-email">Email</Label>
                    <Input id="new-user-email" type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} disabled={creating} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-password">Senha inicial</Label>
                    <div className="relative">
                      <Input id="new-user-password" type={showNewPassword ? "text" : "password"} autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} disabled={creating} className="pr-12" aria-describedby="new-user-password-hint" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-0" disabled={creating} aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showNewPassword} onClick={() => setShowNewPassword((current) => !current)}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    </div>
                    <p id="new-user-password-hint" className="text-xs text-muted-foreground">{PASSWORD_HINT} A senha deverá ser trocada no primeiro acesso.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-role">Função</Label>
                    <Select value={newUser.role} onValueChange={(role) => setNewUser({ ...newUser, role })} disabled={creating}>
                      <SelectTrigger id="new-user-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professor">Professor</SelectItem>
                        <SelectItem value="coordenador">Coordenador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-department">{newUser.role === "admin" ? "Departamento (opcional)" : "Departamento *"}</Label>
                    <Select value={newUser.department} onValueChange={(department) => setNewUser({ ...newUser, department })} disabled={creating}>
                      <SelectTrigger id="new-user-department"><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                      <SelectContent>{departments.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={creating}>{creating ? "Cadastrando..." : "Cadastrar usuário"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-white w-4 h-4" />
            <Input
              placeholder="Buscar por nome, email ou departamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto md:items-end">
            <span className="text-sm text-muted-foreground md:text-right">
              {filteredProfessors.length} usuário{filteredProfessors.length === 1 ? "" : "s"} encontrado{filteredProfessors.length === 1 ? "" : "s"}
            </span>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filtrar por tipo de usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredProfessors.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">
                {search ? "Nenhum professor encontrado" : "Nenhum professor cadastrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfessors.map((prof) => (
              <Card key={prof.id} className="transition-colors hover:border-primary/40">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">
                        {prof.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(prof.role)}>
                        {prof.is_absolute_admin ? "Admin" : getRoleLabel(prof.role)}
                      </Badge>
                      {canDeleteUsers && prof.id !== currentUserId && !prof.is_absolute_admin && (isAdmin || ["professor", "coordenador"].includes(prof.role)) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === prof.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o acesso de{" "}
                                <strong>{prof.full_name}</strong>? Esta ação não pode ser desfeita.
                                Contas que criaram planos não podem ser excluídas, para preservar os registros.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(prof.id, prof.full_name)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{prof.full_name}</h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{prof.email}</span>
                    </div>

                    {isAdmin && prof.role !== "admin" ? <div className="space-y-2">
                      <Label htmlFor={`department-${prof.id}`}>Departamento</Label>
                      <Select value={prof.department || ""} disabled={savingDepartment === prof.id} onValueChange={(value) => setDepartment(prof.id, value)}>
                        <SelectTrigger id={`department-${prof.id}`}><SelectValue placeholder="Definir departamento" /></SelectTrigger>
                        <SelectContent>{departments.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div> : prof.department && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{prof.department}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
