Deno.env.set("DELETE_POST_TEST", "1");
const { handleRequest } = await import("./index.ts");

Deno.test("rejects requests without a signed-in user", async () => {
  const response = await handleRequest(new Request("https://example.test", { method: "POST", body: "{}" }));
  if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
});

Deno.test("only accepts POST", async () => {
  const response = await handleRequest(new Request("https://example.test", { method: "GET" }));
  if (response.status !== 405) throw new Error(`Expected 405, got ${response.status}`);
});
