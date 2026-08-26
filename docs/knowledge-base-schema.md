# Strictly knowledge base

The knowledge base stays in Firebase for now. It is deliberately source-backed: AI can normalize labels and draft a claim, but a claim is not shown to users until it has a source and `reviewStatus: "published"`.

## Collections

- `dataSources/{sourceId}` — publisher, URL, license, source type, and refresh date.
- `ingredientEntities/{ingredientId}` — one canonical ingredient, aliases, functional classes, allergen tags, and source IDs.
- `ingredientAliases/{normalizedName}` — fast lookup from a label spelling to an ingredient entity.
- `evidenceClaims/{claimId}` — one claim about one ingredient, including topic, interpretation, evidence strength, source URL, context, and review status.
- `productKnowledge/{productId}` — normalized ingredients for a product plus the source and knowledge version.
- `curationJobs/{jobId}` — an ingestion/enrichment queue created by authenticated app requests or new scans.

## Safety rules

1. `pending`, `needs_review`, and `rejected` claims never appear in the consumer app.
2. A medical-condition claim must include a source, population/context, and an explicit evidence strength.
3. Allergy matches are represented as ingredient presence/conflict, not as a general safety judgment.
4. Every imported record keeps its original source and license metadata.
5. Open datasets with share-alike terms are not silently merged into proprietary exports.
