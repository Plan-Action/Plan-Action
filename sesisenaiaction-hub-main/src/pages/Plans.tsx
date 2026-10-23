import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDepartments } from "@/hooks/use-departments";
import { filterPlans, planFilterSuffix, readPlanFilters, writePlanFilters, type PlanFilters } from "@/lib/plan-navigation";

interface Plan {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
  department: string | null;
}

export default function Plans() {
  const navigate = useNavigate();
  const departments = useDepartments();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [params, setParams] = useSearchParams();
  const filters = readPlanFilters(params);
  const { search, department: departmentFilter, status: statusFilter, priority: priorityFilter } = filters;
  const filterSuffix = planFilterSuffix(params);
  const hasFilters = Boolean(search.trim() || departmentFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all");
  const filteredPlans = filterPlans(plans, filters);
  const updateFilter = (key: keyof PlanFilters, value: string) => {
    setParams((current) => writePlanFilters({ ...readPlanFilters(current), [key]: value }), { replace: true });
  };
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session) {
          navigate("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!active) return;
        if (profile) setUserRole(profile.role);

        // Data API responses are capped. Read every authorized page so filters
        // do not silently miss plans after the first 1,000 rows.
        const rows: Plan[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase.from("action_plans")
            .select("id, title, description, status, priority, start_date, end_date, department")
            .order("created_at", { ascending: false }).order("id")
            .range(offset, offset + 999);
          if (!active) return;
          if (error) throw error;
          rows.push(...(data || []));
          if ((data?.length || 0) < 1000) break;
        }
        if (active) setPlans(rows);
      } catch {
        if (active) { setLoadFailed(true); setPlans([]); }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [navigate, refreshVersion]);

  const canCreatePlan = ["admin", "coordenador"].includes(userRole);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planos de Ação</h1>
            <p className="text-muted-foreground">Gerencie todos os planos de ação</p>
          </div>
          {canCreatePlan && (
            <Button asChild size="lg" className="shadow-lg"><Link to={`/plans/new${filterSuffix}`}>
              <Plus className="mr-2 h-5 w-5" />
              Novo Plano
            </Link></Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_240px_180px_180px]">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-white w-4 h-4" />
            <Input
              placeholder="Buscar planos..."
              aria-label="Buscar planos"
              value={search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={(value) => updateFilter("department", value)}>
            <SelectTrigger aria-label="Filtrar por departamento">
              <SelectValue placeholder="Filtrar por departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os departamentos</SelectItem>
              {departmentFilter !== "all" && !departments.includes(departmentFilter) && <SelectItem value={departmentFilter}>{departmentFilter}</SelectItem>}
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => updateFilter("status", value)}>
            <SelectTrigger aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="planning">Planejamento</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(value) => updateFilter("priority", value)}>
            <SelectTrigger aria-label="Filtrar por prioridade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters && <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted-foreground">{loading ? "Buscando planos..." : loadFailed ? "Consulta indisponível" : `${filteredPlans.length} plano${filteredPlans.length === 1 ? "" : "s"} encontrado${filteredPlans.length === 1 ? "" : "s"}`}</p>
          <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>Limpar filtros</Button>
        </div>}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : loadFailed ? (
          <Card><CardContent className="space-y-4 py-12 text-center">
            <p role="alert">Não foi possível carregar os planos. Seus filtros foram preservados.</p>
            <Button variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>Tentar novamente</Button>
          </CardContent></Card>
        ) : filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">
                {hasFilters ? "Nenhum plano encontrado com esses filtros" : "Nenhum plano cadastrado ainda"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <Card
                key={plan.id}
                className="group hover:shadow-lg transition-all"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      <Link to={`/plans/${plan.id}${filterSuffix}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{plan.title}</Link>
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`${getStatusColor(plan.status)} ${plan.status === 'in_progress' ? 'text-white' : ''}`}>
                      {getStatusLabel(plan.status)}
                    </Badge>
                    <Badge variant="outline">
                      {getPriorityLabel(plan.priority)}
                    </Badge>
                    <Badge variant="secondary">
                      {plan.department || "Sem departamento definido"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 dark:text-white" />
                    <span>
                      {format(parseISO(plan.start_date), "dd MMM", { locale: ptBR })} -{" "}
                      {format(parseISO(plan.end_date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  <Button asChild variant="ghost" className="w-full text-card-foreground" size="sm"><Link to={`/plans/${plan.id}${filterSuffix}`}>
                    <Eye className="mr-2 w-4 h-4" />
                    Ver detalhes
                  </Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
