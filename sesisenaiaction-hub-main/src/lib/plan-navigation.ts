const statuses = ["planning", "in_progress", "completed", "cancelled", "active"];
const priorities = ["low", "medium", "high", "urgent"];
const deadlines = ["overdue", "upcoming"];

export interface PlanFilters {
  search: string;
  department: string;
  status: string;
  priority: string;
  deadline: string;
  classId?: string;
}

export function readPlanFilters(params: URLSearchParams): PlanFilters {
  const status = params.get("status") || "all";
  const priority = params.get("priority") || "all";
  return {
    search: params.get("q") || "",
    department: params.get("department") || "all",
    status: statuses.includes(status) ? status : "all",
    priority: priorities.includes(priority) ? priority : "all",
    deadline: deadlines.includes(params.get("deadline") || "") ? params.get("deadline") || "all" : "all",
    ...(params.get('class') ? { classId: params.get('class') || 'all' } : {}),
  };
}

export function writePlanFilters(filters: PlanFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.department && filters.department !== "all") params.set("department", filters.department);
  if (statuses.includes(filters.status)) params.set("status", filters.status);
  if (priorities.includes(filters.priority)) params.set("priority", filters.priority);
  if (deadlines.includes(filters.deadline)) params.set("deadline", filters.deadline);
  if (filters.classId && filters.classId !== 'all') params.set('class', filters.classId);
  return params;
}

// Only carry known filters. Return destinations are always internal routes,
// never a URL supplied by the caller (e.g. a returnTo query parameter).
export function planFilterSuffix(params: URLSearchParams): string {
  const query = writePlanFilters(readPlanFilters(params)).toString();
  return query ? `?${query}` : "";
}

export function filterPlans<T extends { title: string; description: string | null; department: string | null; status: string; priority: string; end_date: string; class_id?: string | null }>(plans: T[], filters: PlanFilters): T[] {
  const query = filters.search.trim().toLocaleLowerCase("pt-BR");
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = dateKey(new Date());
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const nextWeek = dateKey(weekFromNow);
  return plans.filter((plan) =>
    (!query || `${plan.title} ${plan.description || ""}`.toLocaleLowerCase("pt-BR").includes(query)) &&
    (filters.department === "all" || plan.department === filters.department) &&
    (filters.status === "all" || (filters.status === "active" ? ["planning", "in_progress"].includes(plan.status) : plan.status === filters.status)) &&
    (filters.priority === "all" || plan.priority === filters.priority) &&
    (!filters.classId || filters.classId === 'all' || (filters.classId === 'legacy' ? !plan.class_id : plan.class_id === filters.classId)) &&
    (filters.deadline === "all" || (filters.deadline === "overdue" ? ["planning", "in_progress"].includes(plan.status) && plan.end_date < today : ["planning", "in_progress"].includes(plan.status) && plan.end_date >= today && plan.end_date <= nextWeek))
  );
}
