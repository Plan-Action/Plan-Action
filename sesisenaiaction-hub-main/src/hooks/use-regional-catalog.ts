import { useCallback, useEffect, useState } from 'react';
import { backend } from '@/integrations/neon/client';

export type RegionalRow = { id: string; enabled: boolean; name?: string; code?: string; unit_id?: string; course_id?: string; offering_id?: string; department?: string; class_id?: string; profile_id?: string; profile_name?: string };
export type RegionalCatalog = Record<'units' | 'courses' | 'offerings' | 'classes' | 'supervisors', RegionalRow[]>;
const empty: RegionalCatalog = { units: [], courses: [], offerings: [], classes: [], supervisors: [] };
export function useRegionalCatalog() {
  const [catalog, setCatalog] = useState<RegionalCatalog>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const result = await backend.rpc('regional_catalog' as never);
      if (result.error) throw result.error;
      const value = result.data as unknown as RegionalCatalog;
      if (!value || Object.keys(empty).some(key => !Array.isArray(value[key as keyof RegionalCatalog]))) throw new Error('Invalid catalog');
      setCatalog(value);
    } catch { setError(true); setCatalog(empty); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { catalog, loading, error, refresh };
}

export function regionalClassLabel(catalog: RegionalCatalog, row: RegionalRow) {
  const offering = catalog.offerings.find(item => item.id === row.offering_id);
  const unit = catalog.units.find(item => item.id === offering?.unit_id);
  const course = catalog.courses.find(item => item.id === offering?.course_id);
  return `${unit?.name ?? 'Unidade indisponível'} · ${course?.name ?? 'Curso indisponível'} · ${row.code} — ${row.name}`;
}
