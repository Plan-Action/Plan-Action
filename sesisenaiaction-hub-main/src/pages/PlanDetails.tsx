import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Edit, Calendar, Target, Users, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface Plan {
  id: string;
  title: string;
  description: string;
  objective: string;
  expected_result: string;
  where_location: string;
  how_to_execute: string;
  estimated_cost: number;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  category: string | null;
  department: string | null;
  created_at: string;
}

interface Professor {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

export default function PlanDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile) setUserRole(profile.role);

      const { data: planData } = await supabase
        .from("action_plans")
        .select("*")
        .eq("id", id)
        .single();

      if (planData) setPlan(planData);

      const { data: assignments } = await supabase
        .from("plan_assignments")
        .select(`
          professor_id,
          profiles:professor_id (
            id,
            full_name,
            email,
            department
          )
        `)
        .eq("plan_id", id);

      if (assignments) {
        setProfessors(assignments.map((a: any) => a.profiles).filter(Boolean));
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate, id]);

  const handleDelete = async () => {
    const { error } = await supabase.from("action_plans").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao deletar plano");
    } else {
      toast.success("Plano deletado");
      navigate("/plans");
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      planning: "bg-muted",
      in_progress: "bg-primary",
      completed: "bg-secondary text-white",
      cancelled: "bg-destructive",
    };
    return colors[status as keyof typeof colors] || "bg-muted";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      planning: "Planejamento",
      in_progress: "Em Andamento",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const canEdit = ["admin", "coordenador"].includes(userRole);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Plano não encontrado</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/plans")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{plan.title}</h1>
              <p className="text-muted-foreground mt-1">
                Criado em {format(new Date(plan.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate(`/plans/${id}/edit`)}>
                <Edit className="mr-2 w-4 h-4" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 w-4 h-4" />
                    Deletar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar este plano? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Badge className={`${getStatusColor(plan.status)} ${plan.status === 'in_progress' ? 'text-white' : ''}`}>
            {getStatusLabel(plan.status)}
          </Badge>
          <Badge variant="outline">
            Prioridade: {getPriorityLabel(plan.priority)}
          </Badge>

              {plan.department && <Badge variant="outline">{plan.department}</Badge>}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 dark:text-white" />
                Período
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Data de Início</p>
                <p className="font-medium">
                  {format(new Date(plan.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Data de Término</p>
                <p className="font-medium">
                  {format(new Date(plan.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Professores ({professors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {professors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum professor atribuído</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {professors.map((prof) => (
                    <div key={prof.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                          {prof.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{prof.full_name}</p>
                        {prof.department && (
                          <p className="text-xs text-muted-foreground truncate">{prof.department}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{plan.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execução 5W2H</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Onde</p>
              <p className="font-medium whitespace-pre-wrap">{plan.where_location || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quanto</p>
              <p className="font-medium">
                {Number(plan.estimated_cost || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Como</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{plan.how_to_execute || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Motivo</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{plan.expected_result || "Não informado"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Objetivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{plan.objective}</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
