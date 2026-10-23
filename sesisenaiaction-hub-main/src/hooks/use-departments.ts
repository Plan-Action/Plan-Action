import { useEffect, useState } from "react";
import { backend as supabase } from "@/integrations/neon/client";
import { toast } from "sonner";

export function useDepartments() {
  const [departments, setDepartments] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    supabase.from("departments").select("name").order("name").then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error("Não foi possível carregar os departamentos");
      else setDepartments((data || []).map((item) => item.name));
    });
    return () => { active = false; };
  }, []);
  return departments;
}
