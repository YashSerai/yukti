import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the signed-out Yukti product landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Yukti \| Thoughtful gifts, prepared<\/title>/i);
  assert.match(html, /Thoughtful gifts, without starting from scratch/);
  assert.match(html, /Get started with GitHub/);
  assert.match(html, /Remember the person/);
  assert.doesNotMatch(html, /Sarah|Purchase approval|Upcoming|Your site is taking shape|react-loading-skeleton|Private by design|Memory connected|seeded|fixture|sponsor integration/i);
});
