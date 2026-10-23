import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorized} from '../lib/probe.mjs';
import handler from '../api/health.mjs';
test('rejects absent, malformed and short credentials',()=>{
  for(const header of [undefined,'','Bearer incorrect','Basic secret']) assert.equal(authorized(header,'a'.repeat(32)),false);
  assert.equal(authorized('Bearer short','short'),false);
  assert.equal(authorized(`Bearer ${'a'.repeat(32)}`,'a'.repeat(32)),true);
});
test('unauthorized requests cannot reach the database',async()=>{
  const previous=process.env.MIGRATION_TEST_ENABLED; process.env.MIGRATION_TEST_ENABLED='true';
  let status; const res={setHeader(){},status(value){status=value;return this;},json(value){return value;}};
  try {await handler({method:'GET',headers:{}},res); assert.equal(status,401);}
  finally {if(previous===undefined) delete process.env.MIGRATION_TEST_ENABLED;else process.env.MIGRATION_TEST_ENABLED=previous;}
});
