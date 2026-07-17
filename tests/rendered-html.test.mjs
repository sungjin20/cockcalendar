import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);

async function render(path, init = {}) {
  const { default: worker } = await import(`${workerUrl.href}?test=${Date.now()}-${Math.random()}`);
  return worker.fetch(new Request(`http://localhost${path}`, init), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("home page renders the public competition experience", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /콕캘린더/);
  assert.match(html, /다가오는 대회/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("competition list API returns future events in date order", async () => {
  const response = await render("/api/competitions?from=2026-07-17");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 0);
  assert.deepEqual(body.data.map((item) => item.startDate), [...body.data].map((item) => item.startDate).sort((a, b) => a.localeCompare(b)));
  assert.ok(body.data.every((item) => item.startDate > "2026-07-17"));
  assert.equal(body.data.length, 0);
});

test("empty competition store returns 404 for removed details", async () => {
  const apiResponse = await render("/api/competitions/seoul-summer-open-2026");
  assert.equal(apiResponse.status, 404);
});

test("unknown competition returns a 404", async () => {
  const response = await render("/api/competitions/not-found");
  assert.equal(response.status, 404);
});
