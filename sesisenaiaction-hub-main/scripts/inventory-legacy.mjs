import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const required = ['departments', 'profiles', 'action_plans', 'plan_assignments'];
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

// Offline inventory only: never connects to a database or rewrites the export.
export function inventoryLegacy(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('invalid_export');
  for (const name of required) {
    if (!Array.isArray(snapshot[name]) || snapshot[name].some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('invalid_export');
  }
  const blockers = [];
  const tables = {};
  for (const [name, rows] of Object.entries(snapshot)) {
    if (!Array.isArray(rows)) continue;
    if (rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('invalid_export');
    const key = name === 'departments' ? 'name' : 'id';
    const ids = rows.map(row => row[key]);
    if (required.includes(name)) {
      const missing = ids.filter(id => typeof id !== 'string' || !id.trim()).length;
      const present = ids.filter(id => typeof id === 'string' && id.trim());
      const duplicates = present.length - new Set(present).size;
      if (missing) blockers.push({table: name, code: 'missing_key', count: missing});
      if (duplicates) blockers.push({table: name, code: 'duplicate_key', count: duplicates});
    }
    tables[name] = {count: rows.length, fields: [...new Set(rows.flatMap(Object.keys))].sort()};
  }
  const profiles = new Set(snapshot.profiles.map(row => row.id));
  const plans = new Set(snapshot.action_plans.map(row => row.id));
  const departments = new Set(snapshot.departments.map(row => row.name));
  const check = (table, code, predicate) => {
    const count = snapshot[table].filter(predicate).length;
    if (count) blockers.push({table, code, count});
  };
  check('action_plans', 'missing_creator', row => !profiles.has(row.created_by));
  check('action_plans', 'unknown_department', row => row.department != null && !departments.has(row.department));
  check('profiles', 'unknown_department', row => row.department != null && !departments.has(row.department));
  check('plan_assignments', 'missing_plan', row => !plans.has(row.plan_id));
  check('plan_assignments', 'missing_professor', row => !profiles.has(row.professor_id));
  const pairs = new Set();
  check('plan_assignments', 'duplicate_assignment', row => {
    const pair = JSON.stringify([row.plan_id, row.professor_id]);
    if (pairs.has(pair)) return true;
    pairs.add(pair); return false;
  });
  return {
    formatVersion: 1,
    fingerprint: createHash('sha256').update(canonical(snapshot)).digest('hex'),
    tables,
    blockers,
    legacyPlansWithoutPedagogicalContext: snapshot.action_plans.filter(row => ['evaluation_id', 'class_id', 'capacity_id', 'unit_id'].some(field => row[field] == null)).length,
    readyForMappingReview: blockers.length === 0 && snapshot.action_plans.length > 0,
    // Structural consistency does not prove completeness or authorize a cutover.
    productionMigrationApproved: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('invalid_export');
    const report = inventoryLegacy(JSON.parse(await readFile(process.argv[2], 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    if (!report.readyForMappingReview) process.exitCode = 2;
  } catch {
    // Do not print export content, filesystem errors, names, emails or credentials.
    console.error('Não foi possível inventariar. Informe um JSON válido com departments, profiles, action_plans e plan_assignments.');
    process.exitCode = 1;
  }
}
