import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  loading?: boolean;
  variant?: "default" | "primary" | "secondary";
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, loading, onClick }: StatCardProps) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick || loading} className={`w-full px-5 py-5 text-left sm:px-6 ${onClick ? "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" : "cursor-default"}`} aria-label={onClick ? `${title}: ${value}. Abrir lista correspondente` : undefined}>
      <div className="mb-2 flex items-center justify-between gap-3">
        {loading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-semibold tabular-nums text-primary">{value}</p>}
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
    </button>
  );
}
