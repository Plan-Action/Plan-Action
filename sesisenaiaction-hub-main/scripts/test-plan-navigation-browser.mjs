// Run against the production build with isolated Auth/Data API fixtures.
// No requests are sent to the real Supabase project.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createSecureServer } from "./serve-secure.mjs";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : "playwright");
const { supabaseOrigin } = JSON.parse(await readFile("dist/security-config.json", "utf8"));
const id = "00000000-0000-0000-0000-000000000001";
const user = { id, email: "fixture@example.test", app_metadata: {}, user_metadata: {}, aud: "authenticated", role: "authenticated" };
const profile = { ...user, full_name: "Usuário de teste", department: "Educação", role: "admin", is_absolute_admin: true };
const initialPlan = { id, title: "Ação pedagógica", description: "Melhorar resultado", objective: "Objetivo", expected_result: "Justificativa", where_location: "Sala", how_to_execute: "Etapas", estimated_cost: 0, start_date: "2026-10-01", end_date: "2026-11-01", created_at: "2026-10-01T12:00:00Z", department: "Educação", status: "in_progress", priority: "high", category: null };

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`plan navigation, retry and pagination at ${viewport.width}px`, { timeout: 60000 }, async () => {
    const server = createSecureServer();
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
      browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
      const context = await browser.newContext({ viewport, timezoneId: "America/Sao_Paulo" });
      const jwt = [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"), "fixture"].join(".");
      const session = { access_token: jwt, refresh_token: "fixture", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user };
      await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${new URL(supabaseOrigin).hostname.split(".")[0]}-auth-token`, session });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      let failPlans = false;
      let paginated = false;
      let saved = false;
      let plan = { ...initialPlan };
      await page.route("**/*", async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        if (url.origin !== supabaseOrigin) return route.abort();
        const send = (body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) });
        if (url.pathname === "/auth/v1/user") return send(user);
        if (url.pathname === "/rest/v1/profiles") return send(url.searchParams.has("id") ? profile : [profile]);
        if (url.pathname === "/rest/v1/departments") return send([{ name: "Educação" }]);
        if (url.pathname === "/rest/v1/plan_assignments") return send([]);
        if (url.pathname === "/rest/v1/rpc/save_department_plan") {
          plan = { ...plan, ...request.postDataJSON().details };
          saved = true;
          return send(id);
        }
        if (url.pathname === "/rest/v1/action_plans") {
          if (failPlans) return send({ message: "Fixture failure" }, 500);
          if (url.searchParams.has("id")) return send(plan);
          if (paginated) return send(Number(url.searchParams.get("offset") || 0) === 0
            ? Array.from({ length: 1000 }, (_, index) => ({ ...initialPlan, id: `fixture-${index}`, title: `Outro plano ${index}`, description: "Outra descrição" }))
            : [{ ...initialPlan, title: "Última página" }]);
          return send([plan, { ...initialPlan, id: "other", title: "Plano de TI", department: "TI" }]);
        }
        throw new Error(`Unexpected fixture request: ${url.pathname}`);
      });
      const query = new URLSearchParams({ q: "resultado", department: "Educação", status: "in_progress", priority: "high" }).toString();
      const expectedList = `${origin}/plans?${query}`;
      await page.goto(expectedList);
      await page.getByText("1 plano encontrado", { exact: true }).waitFor();
      await page.getByText("01 out - 01 nov 2026", { exact: true }).waitFor();
      assert.equal(await page.getByLabel("Buscar planos", { exact: true }).inputValue(), "resultado");
      await page.reload();
      await page.getByText("1 plano encontrado", { exact: true }).waitFor();
      await page.getByRole("link", { name: "Ver detalhes", exact: true }).click();
      await page.getByRole("button", { name: "Editar", exact: true }).click();
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await page.waitForURL(expectedList);
      await page.getByRole("link", { name: "Ver detalhes", exact: true }).click();
      await page.getByRole("button", { name: "Editar", exact: true }).click();
      await page.getByLabel("Título da ação", { exact: true }).fill("Ação atualizada");
      await page.getByRole("button", { name: "Atualizar Plano", exact: true }).click();
      await page.getByRole("heading", { name: "Ação atualizada", exact: true }).waitFor();
      assert.equal(saved, true);
      await page.getByRole("button", { name: "Voltar aos planos", exact: true }).click();
      await page.waitForURL(expectedList);
      await page.getByText("1 plano encontrado", { exact: true }).waitFor();
      // Browser back/forward must also reconstruct the prior query state.
      await page.goBack();
      await page.getByRole("heading", { name: "Ação atualizada", exact: true }).waitFor();
      await page.goForward();
      await page.waitForURL(expectedList);
      await page.getByText("1 plano encontrado", { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (process.env.SCREENSHOT_DIR) {
        await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, `plans-${viewport.width}-light.png`), fullPage: true });
      }
      await page.getByRole("button", { name: "Ativar modo escuro", exact: true }).click();
      await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
      await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
      assert.equal(await page.getByRole("link", { name: "Ver detalhes", exact: true }).evaluate(element => getComputedStyle(element).color), await page.getByRole("link", { name: "Ação atualizada", exact: true }).evaluate(element => getComputedStyle(element).color));
      if (process.env.SCREENSHOT_DIR) {
        await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, `plans-${viewport.width}-dark.png`), fullPage: true });
      }
      await page.getByRole("link", { name: "Novo Plano", exact: true }).click();
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await page.waitForURL(expectedList);
      await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
      await page.waitForURL(`${origin}/plans`);
      await page.waitForFunction(() => document.querySelector('input[aria-label="Buscar planos"]')?.value === "");
      assert.equal(await page.getByLabel("Buscar planos", { exact: true }).inputValue(), "");
      await page.getByLabel("Buscar planos", { exact: true }).fill("inexistente");
      await page.getByText("Nenhum plano encontrado com esses filtros", { exact: true }).waitFor();
      failPlans = true;
      await page.reload();
      await page.getByRole("alert").waitFor();
      assert.equal(await page.getByLabel("Buscar planos", { exact: true }).inputValue(), "inexistente");
      failPlans = false;
      await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
      await page.getByText("Nenhum plano encontrado com esses filtros", { exact: true }).waitFor();
      paginated = true;
      await page.goto(`${origin}/plans?q=${encodeURIComponent("Última página")}`);
      await page.getByText("1 plano encontrado", { exact: true }).waitFor();
      await page.getByRole("link", { name: "Última página", exact: true }).waitFor();
      assert.deepEqual(errors, []);
    } finally {
      if (browser) await browser.close();
      await new Promise(resolve => server.close(resolve));
    }
  });
}
