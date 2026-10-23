const statuses = ["planning", "in_progress", "completed", "cancelled"];
const priorities = ["low", "medium", "high", "urgent"];

export interface PlanFilters {
  search: string;
  department: string;
  status: string;
  priority: string;
}

export function readPlanFilters(params: URLSearchParams): PlanFilters {
  const status = params.get("status") || "all";
  const priority = params.get("priority") || "all";
  return {
    search: params.get("q") || "",
    department: params.get("department") || "all",
    status: statuses.includes(status) ? status : "all",
    priority: priorities.includes(priority) ? priority : "all",
  };
}

export function writePlanFilters(filters: PlanFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.department && filters.department !== "all") params.set("department", filters.department);
  if (statuses.includes(filters.status)) params.set("status", filters.status);
  if (priorities.includes(filters.priority)) params.set("priority", filters.priority);
  return params;
}

// Only carry known filters. Return destinations are always internal routes,
// never a URL supplied by the caller (e.g. a returnTo query parameter).
export function planFilterSuffix(params: URLSearchParams): string {
  const query = writePlanFilters(readPlanFilters(params)).toString();
  return query ? `?${query}` : "";
}

export function filterPlans<T extends { title: string; description: string | null; department: string | null; status: string; priority: string }>(plans: T[], filters: PlanFilters): T[] {
  const query = filters.search.trim().toLocaleLowerCase("pt-BR");
  return plans.filter((plan) =>
    (!query || `${plan.title} ${plan.description || ""}`.toLocaleLowerCase("pt-BR").includes(query)) &&
    (filters.department === "all" || plan.department === filters.department) &&
    (filters.status === "all" || plan.status === filters.status) &&
    (filters.priority === "all" || plan.priority === filters.priority)
  );
}
