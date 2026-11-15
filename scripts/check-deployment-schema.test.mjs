import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDeploymentSchema } from "./check-deployment-schema.mjs";
const env = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key" };
const response = (status, payload) => ({ status, ok: status >= 200 && status < 300, json: async () => payload });
test("holds deployment when required migrations are absent", async () => {
  const result = await checkDeploymentSchema(env, async () => response(404, { code: "PGRST205" }));
  assert.equal(result.ready, false);
  assert.equal(result.missing.length, 5);
});
test("accepts existing tables and deliberately denied anonymous RPC calls", async () => {
  const result = await checkDeploymentSchema(env, async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return options.method === "POST" ? response(401, { code: "42501" }) : response(200, []);
  });
  assert.equal(result.ready, true);
});
test("does not mistake an invalid key or unexpectedly executable RPC for readiness", async () => {
  assert.equal((await checkDeploymentSchema(env, async () => response(401, { code: "PGRST301" }))).ready, false);
  assert.equal((await checkDeploymentSchema(env, async () => response(200, []))).ready, false);
});
test("holds deployment on network failure or absent configuration", async () => {
  assert.equal((await checkDeploymentSchema(env, async () => { throw new Error("offline"); })).ready, false);
  assert.equal((await checkDeploymentSchema({})).ready, false);
});
