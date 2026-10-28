import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { backend } from '@/integrations/neon/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDepartments } from '@/hooks/use-departments';
import { regionalClassLabel, useRegionalCatalog, type RegionalRow } from '@/hooks/use-regional-catalog';
import { toast } from 'sonner';

const kinds = { unit: 'Unidades', course: 'Cursos', offering: 'Cursos por unidade', class: 'Turmas', supervisor: 'Supervisores por turma' };
const tables = { unit: 'units', course: 'courses', offering: 'offerings', class: 'classes', supervisor: 'supervisors' } as const;
type Kind = keyof typeof kinds;
type Form = { enabled: boolean; id?: string; name: string; code: string; unit_id: string; course_id: string; offering_id: string; department: string; class_id: string; profile_id: string };
const blank: Form = { enabled: true, name: '', code: '', unit_id: '', course_id: '', offering_id: '', department: '', class_id: '', profile_id: '' };
const selectStyle = 'flex h-10 w-full rounded-sm border border-input bg-background px-3 text-sm';

export default function RegionalCatalogPage() {
  const { catalog, loading, error, refresh } = useRegionalCatalog();
  const departments = useDepartments();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [coordinators, setCoordinators] = useState<{ id: string; full_name: string; department: string | null }[]>([]);
  const [kind, setKind] = useState<Kind>('unit');
  const [form, setForm] = useState<Form>(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await backend.auth.getSession();
        if (!session.data.session) { if (active) setAllowed(false); return; }
        const profile = await backend.from('profiles').select('role').eq('id', session.data.session.user.id).single();
        if (!active) return;
        const canManage = !profile.error && profile.data?.role === 'admin';
        setAllowed(canManage);
        if (canManage) {
          const result = await backend.from('profiles').select('id,full_name,department').eq('role', 'coordenador').order('full_name');
          if (result.error) throw result.error;
          if (active) setCoordinators(result.data ?? []);
        }
      } catch { if (active) { setAllowed(false); toast.error('Não foi possível verificar seu acesso.'); } }
    })();
    return () => { active = false; };
  }, []);
  const set = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const nameOf = (table: 'units' | 'courses', id?: string) => catalog[table].find(row => row.id === id)?.name ?? 'Indisponível';
  const offeringLabel = (row: RegionalRow) => `${nameOf('units', row.unit_id)} · ${nameOf('courses', row.course_id)}`;
  const label = (row: RegionalRow) => kind === 'offering' ? offeringLabel(row) : kind === 'class' ? regionalClassLabel(catalog, row) : kind === 'supervisor' ? `${catalog.classes.find(c => c.id === row.class_id)?.code ?? 'Turma'} · ${row.profile_name ?? coordinators.find(c => c.id === row.profile_id)?.full_name ?? 'Coordenador indisponível'}` : row.name;
  async function save(details: Record<string, unknown>) {
    setSaving(true);
    try {
      const result = await backend.rpc('save_regional_entry' as never, { kind, details } as never);
      if (result.error) throw result.error;
      toast.success('Cadastro atualizado.'); setForm(blank); await refresh();
    } catch { toast.error('Não foi possível salvar. Verifique duplicações, vínculos ativos e permissões.'); }
    finally { setSaving(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void save({ ...form }); }
  const selectedClass = catalog.classes.find(row => row.id === form.class_id);
  return <DashboardLayout>
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Estrutura regional</h1><p className="text-muted-foreground">Unidades, cursos, turmas e vínculos dos supervisores.</p></div>
      {allowed === null ? <p role="status">Verificando acesso…</p> : !allowed ? <p role="alert">A gestão destes cadastros é restrita aos administradores. <Link to="/dashboard" className="underline">Voltar à visão geral</Link></p> : <>
        <div className="flex flex-wrap gap-2" aria-label="Tipos de cadastro">{Object.entries(kinds).map(([value, title]) => <Button key={value} variant={kind === value ? 'default' : 'outline'} onClick={() => { setKind(value as Kind); setForm(blank); }}>{title}</Button>)}</div>
        {error ? <div role="alert">Cadastros indisponíveis. <Button variant="outline" onClick={() => void refresh()}>Tentar novamente</Button></div> : loading ? <p role="status">Carregando cadastros…</p> : <>
          <Card><CardHeader><CardTitle>{form.id ? 'Editar cadastro' : 'Novo cadastro'}</CardTitle></CardHeader><CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              {(kind === 'unit' || kind === 'course' || kind === 'class') && <div className="space-y-2"><Label htmlFor="regional-name">Nome</Label><Input id="regional-name" required maxLength={kind === 'unit' ? 120 : 160} value={form.name} onChange={event => set('name', event.target.value)} /></div>}
              {kind === 'offering' && <>
                <div className="space-y-2"><Label htmlFor="regional-unit">Unidade</Label><select id="regional-unit" required className={selectStyle} value={form.unit_id} onChange={event => set('unit_id', event.target.value)}><option value="">Selecione</option>{catalog.units.filter(row => row.enabled).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="regional-course">Curso</Label><select id="regional-course" required className={selectStyle} value={form.course_id} onChange={event => set('course_id', event.target.value)}><option value="">Selecione</option>{catalog.courses.filter(row => row.enabled).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
              </>}
              {kind === 'class' && <>
                <div className="space-y-2"><Label htmlFor="regional-code">Código da turma</Label><Input id="regional-code" required maxLength={80} value={form.code} onChange={event => set('code', event.target.value)} /></div>
                {!form.id && <><div className="space-y-2"><Label htmlFor="regional-offering">Curso e unidade</Label><select id="regional-offering" required className={selectStyle} value={form.offering_id} onChange={event => set('offering_id', event.target.value)}><option value="">Selecione</option>{catalog.offerings.filter(row => row.enabled && catalog.units.some(u => u.id === row.unit_id && u.enabled) && catalog.courses.some(c => c.id === row.course_id && c.enabled)).map(row => <option key={row.id} value={row.id}>{offeringLabel(row)}</option>)}</select></div>
                  <div className="space-y-2"><Label htmlFor="regional-department">Departamento</Label><select id="regional-department" required className={selectStyle} value={form.department} onChange={event => set('department', event.target.value)}><option value="">Selecione</option>{departments.map(value => <option key={value}>{value}</option>)}</select></div></>}
              </>}
              {kind === 'supervisor' && <>
                <div className="space-y-2"><Label htmlFor="regional-class">Turma</Label><select id="regional-class" required className={selectStyle} value={form.class_id} onChange={event => setForm(current => ({ ...current, class_id: event.target.value, profile_id: '' }))}><option value="">Selecione</option>{catalog.classes.filter(row => row.enabled).map(row => <option key={row.id} value={row.id}>{regionalClassLabel(catalog, row)}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="regional-supervisor">Coordenador responsável</Label><select id="regional-supervisor" required disabled={!selectedClass} className={selectStyle} value={form.profile_id} onChange={event => set('profile_id', event.target.value)}><option value="">Selecione</option>{coordinators.filter(row => row.department === selectedClass?.department).map(row => <option key={row.id} value={row.id}>{row.full_name}</option>)}</select></div>
              </>}
              <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>{form.id && <Button type="button" variant="outline" disabled={saving} onClick={() => setForm(blank)}>Cancelar edição</Button>}</div>
            </form>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>{kinds[kind]}</CardTitle></CardHeader><CardContent><ul className="divide-y">{catalog[tables[kind]].map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="break-words">{label(row)}</p><p className="text-sm text-muted-foreground">{row.enabled ? 'Ativo' : 'Inativo — histórico preservado'}</p></div><div className="flex gap-2">{['unit', 'course', 'class'].includes(kind) && <Button variant="outline" disabled={saving} onClick={() => setForm({ ...blank, id: row.id, enabled: row.enabled, name: row.name ?? '', code: row.code ?? '' })}>Editar</Button>}<Button variant="outline" disabled={saving} onClick={() => void save({ ...row, enabled: !row.enabled })}>{row.enabled ? 'Desativar' : 'Reativar'}</Button></div></li>)}</ul>{catalog[tables[kind]].length === 0 && <p className="text-muted-foreground">Nenhum cadastro. Os dados serão informados pela gestão.</p>}</CardContent></Card>
        </>}
      </>}
    </div>
  </DashboardLayout>;
}
