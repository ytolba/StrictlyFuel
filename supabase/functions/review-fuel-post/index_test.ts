Deno.env.set("COMMUNITY_MODERATION_TEST", "1");
const { handleRequest } = await import("./index.ts");

Deno.test("review queue cannot be opened without authentication", async () => {
  const response = await handleRequest(new Request("http://localhost/review-fuel-post", { method: "GET" }));
  if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
});
