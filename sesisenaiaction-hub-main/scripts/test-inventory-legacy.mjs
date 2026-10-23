import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryLegacy } from './inventory-legacy.mjs';

const sample = () => ({
  departments: [{name: 'TI'}],
  profiles: [{id: 'u1', email: 'private@example.test', department: 'TI'}],
  action_plans: [{id: 'p1', created_by: 'u1', department: 'TI', title: 'Private title', start_date: '2026-01-01'}],
  plan_assignments: [{id: 'a1', plan_id: 'p1', professor_id: 'u1'}],
});
test('inventories without changing the original or inventing context', () => {
  const input = sample(), original = structuredClone(input);
  const report = inventoryLegacy(input);
  assert.deepEqual(input, original);
  assert.equal(report.readyForMappingReview, true);
  assert.equal(report.productionMigrationApproved, false);
  assert.equal(report.legacyPlansWithoutPedagogicalContext, 1);
  assert.doesNotMatch(JSON.stringify(report), /private@example|Private title|2026-01-01/);
});
test('rejects incomplete and malformed exports', () => {
  for (const input of [null, [], {}, {...sample(), profiles: [null]}, {...sample(), attachments: [false]}]) assert.throws(() => inventoryLegacy(input));
});
test('detects broken references and duplicate identity keys', () => {
  const input = sample();
  input.profiles.push({...input.profiles[0]});
  input.action_plans[0].created_by = 'missing';
  input.action_plans[0].department = 'missing';
  input.plan_assignments[0].plan_id = 'missing';
  input.plan_assignments[0].professor_id = 'missing';
  const report = inventoryLegacy(input);
  assert.deepEqual(new Set(report.blockers.map(b => b.code)), new Set(['duplicate_key', 'missing_creator', 'unknown_department', 'missing_plan', 'missing_professor']));
  assert.equal(report.readyForMappingReview, false);
});
test('empty export cannot pass as a completed migration', () => {
  const report = inventoryLegacy({departments: [], profiles: [], action_plans: [], plan_assignments: []});
  assert.equal(report.readyForMappingReview, false);
});
test('fingerprint is stable across object key order and covers historical fields', () => {
  const input = sample();
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  assert.equal(inventoryLegacy(input).fingerprint, inventoryLegacy(reordered).fingerprint);
  input.action_plans[0].start_date = '2026-01-02';
  assert.notEqual(inventoryLegacy(input).fingerprint, inventoryLegacy(sample()).fingerprint);
});
test('inventories attachments and additional history without discarding fields', () => {
  const input = {...sample(), attachments: [{id: 'file1', path: 'private/file.pdf'}]};
  const report = inventoryLegacy(input);
  assert.deepEqual(report.tables.attachments, {count: 1, fields: ['id', 'path']});
  assert.doesNotMatch(JSON.stringify(report), /private\/file/);
});
test('flags repeated assignments and missing keys', () => {
  const input = sample();
  input.plan_assignments.push({...input.plan_assignments[0], id: ''});
  assert.deepEqual(inventoryLegacy(input).blockers.map(b => b.code), ['missing_key', 'duplicate_assignment']);
});
