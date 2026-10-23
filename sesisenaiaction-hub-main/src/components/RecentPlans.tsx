import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Plan {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
}

export function RecentPlans({ userRole, onDeleted }: { userRole: string; onDeleted: () => void }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canDelete = ["admin", "coordenador"].includes(userRole);

  const deletePlan = async (plan: Plan) => {
    if (!canDelete || deletingId) return;
    setDeletingId(plan.id);
    try {
      const { data, error } = await supabase.from("action_plans").delete().eq("id", plan.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Não foi possível excluir o plano. Verifique sua permissão ou atualize a página.");
      toast.success("Plano excluído");
      onDeleted();
    } catch {
      toast.error("Não foi possível excluir o plano. Verifique sua permissão e tente novamente.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("action_plans")
        .select("id, title, status, priority, start_date, end_date")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) setFailed(true);
      if (data) setPlans(data);
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      planning: "bg-muted text-muted-foreground",
      in_progress: "bg-primary/10 text-primary",
      completed: "bg-primary/10 text-primary",
      cancelled: "bg-destructive/10 text-destructive",
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
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b py-4">
        <CardTitle className="text-base">Planos recentes</CardTitle>
        <Button variant="link" className="h-auto p-0" onClick={() => navigate("/plans")}>Ver todos <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="space-y-3 p-5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : failed ? <p className="p-8 text-center text-sm text-muted-foreground">Não foi possível carregar os planos. Atualize a página.</p> : plans.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhum plano cadastrado ainda</p> : (
          <Table>
            <TableHeader className="bg-muted/50"><TableRow>
              <TableHead className="pl-6">Plano</TableHead><TableHead>Prioridade</TableHead><TableHead>Prazo</TableHead><TableHead>Situação</TableHead><TableHead><span className="sr-only">Ações</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{plans.map((plan) => <TableRow key={plan.id}>
              <TableCell className="min-w-48 pl-6 font-medium"><button className="text-left hover:text-primary hover:underline" onClick={() => navigate(`/plans/${plan.id}`)}>{plan.title}</button></TableCell>
              <TableCell>{getPriorityLabel(plan.priority)}</TableCell>
              <TableCell className="whitespace-nowrap">{format(parseISO(plan.end_date), "dd MMM yyyy", { locale: ptBR })}</TableCell>
              <TableCell><Badge variant="outline" className={`whitespace-nowrap border-transparent ${getStatusColor(plan.status)}`}>{getStatusLabel(plan.status)}</Badge></TableCell>
              <TableCell className="pr-5 text-right"><div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" aria-label={`Ver plano ${plan.title}`} onClick={() => navigate(`/plans/${plan.id}`)}><Eye className="h-4 w-4" /></Button>
                {canDelete && <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={deletingId !== null} aria-label={`Excluir plano ${plan.title}`} className="border border-transparent hover:border-red-500 hover:bg-red-100 hover:text-red-700 focus-visible:border-red-500 focus-visible:bg-red-100 focus-visible:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-200 dark:focus-visible:bg-red-950 dark:focus-visible:text-red-200"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir plano?</AlertDialogTitle><AlertDialogDescription>Deseja excluir o plano “{plan.title}”? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" disabled={deletingId !== null} onClick={() => void deletePlan(plan)}>Excluir plano</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>}
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
