import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { regionalClassLabel, useRegionalCatalog } from '@/hooks/use-regional-catalog';

export function RegionalClassPicker({ value, department, onChange }: { value: string; department: string; onChange: (value: string) => void }) {
  const { catalog, loading, error, refresh } = useRegionalCatalog();
  const classes = catalog.classes.filter(row => row.id === value || (row.enabled && row.department === department && catalog.offerings.some(o => o.id === row.offering_id && o.enabled && catalog.units.some(u => u.id === o.unit_id && u.enabled) && catalog.courses.some(c => c.id === o.course_id && c.enabled))));
  return <div className="space-y-2">
    <Label htmlFor="plan-regional-class">Unidade, curso e turma (opcional)</Label>
    <select id="plan-regional-class" className="flex h-10 w-full rounded-sm border border-input bg-background px-3 text-sm" disabled={loading || error} value={value} onChange={event => onChange(event.target.value)}>
      <option value="">Plano geral / legado sem turma</option>
      {value && !classes.some(row => row.id === value) && <option value={value}>Vínculo existente indisponível</option>}
      {classes.map(row => <option key={row.id} value={row.id}>{regionalClassLabel(catalog, row)}{!row.enabled ? ' (inativa)' : ''}</option>)}
    </select>
    {error ? <p role="alert" className="text-sm">Não foi possível carregar as turmas. <Button type="button" variant="link" onClick={() => void refresh()}>Tentar novamente</Button></p> : <p className="text-sm text-muted-foreground">A turma complementa o departamento. Planos existentes continuam sem classificação automática.</p>}
  </div>;
}
