import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, ClipboardList, Users, CheckCircle2, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { RecentPlans } from "@/components/RecentPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    completedPlans: 0,
    totalProfessors: 0,
  });
  const [overview, setOverview] = useState({ planning: 0, inProgress: 0, completed: 0, cancelled: 0, overdue: 0, upcoming: 0 });
  const [loadFailed, setLoadFailed] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
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

      const fetchVisiblePlans = async () => {
        const rows: { status: string; end_date: string }[] = [];
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
          const result = await supabase.from("action_plans").select("status, end_date")
            .order("id").range(offset, offset + pageSize - 1);
          if (result.error) return { data: null, error: result.error };
          rows.push(...(result.data || []));
          if ((result.data?.length || 0) < pageSize) return { data: rows, error: null };
        }
      };
      const [plans, professors] = await Promise.all([
        fetchVisiblePlans(),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professor"),
      ]);
      if (plans.error || professors.error) {
        setLoadFailed(true);
        toast.error("Não foi possível carregar todos os indicadores. Atualize a página para tentar novamente.");
        setLoading(false);
        return;
      }
      const visiblePlans = plans.data || [];
      const today = format(new Date(), "yyyy-MM-dd");
      const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const planning = visiblePlans.filter((plan) => plan.status === "planning").length;
      const inProgress = visiblePlans.filter((plan) => plan.status === "in_progress").length;
      const completed = visiblePlans.filter((plan) => plan.status === "completed").length;
      const active = visiblePlans.filter((plan) => ["planning", "in_progress"].includes(plan.status));
      setStats({ totalPlans: visiblePlans.length, activePlans: planning + inProgress, completedPlans: completed, totalProfessors: professors.count || 0 });
      setOverview({ planning, inProgress, completed, cancelled: visiblePlans.filter((plan) => plan.status === "cancelled").length,
        overdue: active.filter((plan) => plan.end_date < today).length,
        upcoming: active.filter((plan) => plan.end_date >= today && plan.end_date <= nextWeek).length });

      setLoading(false);
    };

    checkAuth();
  }, [navigate, refreshVersion]);

  const canCreatePlan = ["admin", "coordenador"].includes(userRole);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visão geral</h1>
            <p className="text-muted-foreground">
              {userRole === "professor" ? "Visão geral dos planos atribuídos a você" : "Visão geral dos planos de ação"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm capitalize text-muted-foreground">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</span>
          {canCreatePlan && (
            <Button onClick={() => navigate("/plans/new")} size="lg" >
              <Plus className="mr-2 h-5 w-5" />
              Novo plano
            </Button>
          )}
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border border border-border bg-card lg:grid-cols-4">
          <StatCard
            title="Total de Planos"
            value={loadFailed ? "—" : stats.totalPlans}
            icon={ClipboardList}
            loading={loading}
          />
          <StatCard
            title="Planos Ativos"
            value={loadFailed ? "—" : stats.activePlans}
            icon={Clock}
            loading={loading}
            variant="primary"
          />
          <StatCard
            title="Concluídos"
            value={loadFailed ? "—" : stats.completedPlans}
            icon={CheckCircle2}
            loading={loading}
            variant="secondary"
          />
          <StatCard
            title="Professores"
            value={loadFailed ? "—" : stats.totalProfessors}
            icon={Users}
            loading={loading}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="border-b py-4"><CardTitle className="text-base">Situação dos planos</CardTitle></CardHeader>
            <CardContent className="space-y-5 pt-5">
              {loading ? <Skeleton className="h-32 w-full" /> : loadFailed ? <p className="text-sm text-muted-foreground">Indicadores indisponíveis. Atualize a página.</p> : stats.totalPlans === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhum plano disponível para acompanhar.</p> : [
                { label: "Em andamento", count: overview.inProgress },
                { label: "Em planejamento", count: overview.planning },
                { label: "Concluídos", count: overview.completed },
                ...(overview.cancelled ? [{ label: "Cancelados", count: overview.cancelled }] : []),
              ].map((item) => <div key={item.label} className="grid grid-cols-[8.5rem_1fr_1.5rem] items-center gap-3 text-sm">
                <span>{item.label}</span>
                <div className="h-2 bg-muted" aria-hidden="true"><div className={`h-full ${item.label === "Concluídos" ? "bg-green-600 dark:bg-green-500" : "bg-primary"}`} style={{ width: `${item.count / stats.totalPlans * 100}%` }} /></div>
                <span className="text-right font-medium tabular-nums">{item.count}</span>
              </div>)}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="border-b py-4"><CardTitle className="text-base">Atenção aos prazos</CardTitle></CardHeader>
            <CardContent className="pt-5">
              {loading ? <Skeleton className="h-32 w-full" /> : loadFailed ? <p className="text-sm text-muted-foreground">Prazos indisponíveis. Atualize a página.</p> : <>
                <div className="flex items-center gap-4 border-b pb-4 text-destructive"><span className="text-3xl font-semibold tabular-nums">{overview.overdue}</span><span className="text-sm">{overview.overdue === 1 ? "Plano atrasado" : "Planos atrasados"}</span></div>
                <div className="flex items-center gap-4 py-4 text-primary"><span className="text-3xl font-semibold tabular-nums">{overview.upcoming}</span><span className="text-sm">{overview.upcoming === 1 ? "Vence nos próximos 7 dias" : "Vencem nos próximos 7 dias"}</span></div>
              </>}
              <Button variant="link" className="h-auto px-0" onClick={() => navigate("/plans")}>Ver planos <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardContent>
          </Card>
        </div>
        <RecentPlans key={refreshVersion} userRole={userRole} onDeleted={() => setRefreshVersion((current) => current + 1)} />
      </div>
    </DashboardLayout>
  );
}
