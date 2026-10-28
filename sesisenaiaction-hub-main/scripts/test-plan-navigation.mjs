import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/plan-navigation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { readPlanFilters, writePlanFilters, planFilterSuffix, filterPlans } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("combined filters survive a direct link, refresh and the list/detail/edit round trip", () => {
  const filters = { search: "Ação & resultado", department: "Educação", status: "in_progress", priority: "high", deadline: "all" };
  const params = writePlanFilters(filters);
  for (const path of ["/plans", "/plans/plan-id", "/plans/plan-id/edit", "/plans/new"]) {
    const destination = new URL(path + planFilterSuffix(params), "https://example.test");
    assert.deepEqual(readPlanFilters(destination.searchParams), filters);
  }
});

test("invalid enum values and arbitrary return destinations never become navigation targets", () => {
  const params = new URLSearchParams("status=invalid&priority=admin&returnTo=https://attacker.test&redirect=//attacker.test");
  assert.equal(planFilterSuffix(params), "");
  assert.deepEqual(readPlanFilters(params), { search: "", department: "all", status: "all", priority: "all", deadline: "all" });
});

test("department text is preserved as data, including query delimiters and accents", () => {
  const filters = { search: "A+B #1", department: "Educação & Gestão=Sul", status: "all", priority: "all", deadline: "all" };
  const suffix = planFilterSuffix(writePlanFilters(filters));
  assert.equal(new URL("/plans" + suffix, "https://example.test").origin, "https://example.test");
  assert.deepEqual(readPlanFilters(new URLSearchParams(suffix)), filters);
});

const plans = [
  { id: "a", title: "Ação pedagógica", description: "Melhorar resultado", department: "Educação", status: "in_progress", priority: "high", end_date: "2099-12-31" },
  { id: "b", title: "Outra ação", description: null, department: "Educação", status: "planning", priority: "high", end_date: "2099-12-31" },
  { id: "c", title: "Ação pedagógica", description: "Melhorar resultado", department: "TI", status: "in_progress", priority: "high", end_date: "2099-12-31" },
];

test("search and department/status/priority apply together without mutating the authorized data", () => {
  const before = structuredClone(plans);
  const result = filterPlans(plans, { search: "  RESULTADO  ", department: "Educação", status: "in_progress", priority: "high", deadline: "all" });
  assert.deepEqual(result.map(plan => plan.id), ["a"]);
  assert.deepEqual(plans, before);
});

test("clearing filters restores all provided rows, including legacy descriptions", () => {
  const params = writePlanFilters({ search: "", department: "all", status: "all", priority: "all", deadline: "all" });
  assert.equal(params.toString(), "");
  assert.deepEqual(filterPlans(plans, readPlanFilters(params)), plans);
});

test("no match and empty authorized datasets return empty results", () => {
  const filters = readPlanFilters(new URLSearchParams("q=inexistente&priority=low"));
  assert.deepEqual(filterPlans(plans, filters), []);
  assert.deepEqual(filterPlans([], filters), []);
});

test('regional filter preserves class context and distinguishes legacy plans', () => {
  const classId = '00000000-0000-0000-0000-000000000123';
  const rows = [{...plans[0],class_id:classId},{...plans[1],class_id:null}];
  const params = new URLSearchParams(`class=${classId}`);
  assert.equal(readPlanFilters(new URLSearchParams(planFilterSuffix(params))).classId,classId);
  assert.deepEqual(filterPlans(rows,readPlanFilters(params)),[rows[0]]);
  assert.deepEqual(filterPlans(rows,readPlanFilters(new URLSearchParams('class=legacy'))),[rows[1]]);
  assert.deepEqual(filterPlans(rows,readPlanFilters(new URLSearchParams('class=unknown'))),[]);
});

test("active and deadline filters match the dashboard indicators", () => {
  const dateKey = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const rows = [
    { ...plans[0], id: "overdue", status: "in_progress", end_date: dateKey(-1) },
    { ...plans[0], id: "upcoming", status: "planning", end_date: dateKey(3) },
    { ...plans[0], id: "completed", status: "completed", end_date: dateKey(-1) },
  ];
  const base = { search: "", department: "all", priority: "all" };

  assert.deepEqual(filterPlans(rows, { ...base, status: "active", deadline: "all" }).map(plan => plan.id), ["overdue", "upcoming"]);
  assert.deepEqual(filterPlans(rows, { ...base, status: "all", deadline: "overdue" }).map(plan => plan.id), ["overdue"]);
  assert.deepEqual(filterPlans(rows, { ...base, status: "all", deadline: "upcoming" }).map(plan => plan.id), ["upcoming"]);
});
