Deno.env.set("COMMUNITY_MODERATION_TEST", "1");
const { decideModeration, handleRequest } = await import("./index.ts");

Deno.test("unsafe image or text is never approved", () => {
  const decision = decideModeration({ results: [
    { flagged: false, category_scores: { violence: 0.001 } },
    { flagged: true, category_scores: { violence: 0.9 } },
  ] });
  if (decision !== "rejected") throw new Error(`Expected rejected, got ${decision}`);
});

Deno.test("uncertain content waits for a person", () => {
  const decision = decideModeration({ results: [{ flagged: false, category_scores: { violence: 0.12 } }] });
  if (decision !== "needs_review") throw new Error(`Expected needs_review, got ${decision}`);
});

Deno.test("only a complete low-risk result can pass", () => {
  const decision = decideModeration({ results: [{ flagged: false, category_scores: { violence: 0.001, sexual: 0.002 } }] });
  if (decision !== "approved") throw new Error(`Expected approved, got ${decision}`);
  for (const invalid of [{ results: [] }, { results: [{ flagged: false }] }]) {
    let threw = false;
    try { decideModeration(invalid); } catch { threw = true; }
    if (!threw) throw new Error("Malformed response must fail closed");
  }
});

Deno.test("an unauthenticated request cannot submit a post", async () => {
  const response = await handleRequest(new Request("http://localhost/publish-fuel-post", { method: "POST", body: "{}" }));
  if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
});
