const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');

const db = admin.firestore();

const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const clean = (value, max = 240) => String(value || '').trim().slice(0, max);
const categoryKeys = (value) => [...new Set(clean(value, 120).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((token) => token.length > 2))].slice(0, 10);
const cacheDocumentId = (value) => crypto.createHash('sha1').update(value).digest('hex').slice(0, 40);

const alternativeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['alternatives'],
  properties: {
    alternatives: {
      type: 'array',
      minItems: 0,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['productName', 'brand', 'ingredients', 'estimatedScore', 'reason', 'sourceUrl', 'sourceTitle'],
        properties: {
          productName: { type: 'string' },
          brand: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' }, maxItems: 80 },
          estimatedScore: { type: 'number', minimum: 90, maximum: 100 },
          reason: { type: 'string' },
          sourceUrl: { type: 'string' },
          sourceTitle: { type: 'string' },
        },
      },
    },
  },
};

const parseResponseJson = (response) => {
  if (typeof response?.output_text === 'string') {
    try { return JSON.parse(response.output_text); } catch (_) { /* fall through */ }
  }
  const text = (response?.output || [])
    .flatMap((item) => item?.content || [])
    .map((content) => content?.text || '')
    .join('');
  try { return JSON.parse(text); } catch (_) { return null; }
};

const readCachedAlternatives = async (category) => {
  const keys = categoryKeys(category);
  if (!keys.length) return [];
  const snapshot = await db.collection('curatedAlternatives')
    .where('status', '==', 'published')
    .limit(100)
    .get();
  return snapshot.docs
    .map((item) => item.data())
    .filter((item) => Array.isArray(item.categoryKeys) && keys.some((key) => item.categoryKeys.includes(key)))
    .filter((item) => item.source === 'openai_web_search' && Array.isArray(item.ingredients) && item.ingredients.length > 0)
    .filter((item) => Number(item.catalogScore || 0) >= 90)
    .sort((a, b) => Number(b.catalogScore || 0) - Number(a.catalogScore || 0))
    .slice(0, 6)
    .map((item) => ({
      productName: clean(item.productName, 160),
      brand: clean(item.brand, 100),
      ingredients: item.ingredients.map((ingredient) => clean(ingredient, 120)).filter(Boolean).slice(0, 80),
      estimatedScore: clamp(item.catalogScore),
      reason: clean(item.reason, 280),
      sourceUrl: clean(item.sourceUrl || item.productUrl, 500),
      sourceTitle: clean(item.sourceTitle || item.productName, 180),
    }));
};

const persistAlternatives = async (alternatives, category, verifiedAt) => {
  const keys = categoryKeys(category);
  await Promise.all(alternatives.map((item) => {
    const sourceUrl = clean(item.sourceUrl, 500);
    const id = `web_${cacheDocumentId(`${sourceUrl}|${item.productName}`)}`;
    return db.collection('curatedAlternatives').doc(id).set({
      id,
      productName: clean(item.productName, 160),
      brand: clean(item.brand, 100),
      ingredients: item.ingredients.map((ingredient) => clean(ingredient, 120)).filter(Boolean).slice(0, 80),
      category: clean(category, 120),
      categoryKeys: keys,
      catalogScore: clamp(item.estimatedScore),
      reason: clean(item.reason, 280),
      source: 'openai_web_search',
      sourceTitle: clean(item.sourceTitle, 180),
      sourceUrl,
      productUrl: sourceUrl,
      sourceIds: ['openai_web_search'],
      status: 'published',
      region: 'global',
      scoringVersion: 'strictly-v1',
      verifiedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }));
};

/**
 * Runs only after the in-app catalog has no strong match. OpenAI web search
 * stays behind Firebase auth and the API key never ships in the mobile app.
 */
exports.searchWebAlternatives = onCall(
  { secrets: ['OPENAI_API_KEY'], timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    const data = request.data || {};
    const context = request.auth;
    if (!context) throw new HttpsError('unauthenticated', 'Sign in to search for alternatives.');
    const category = clean(data?.category, 120);
    const productName = clean(data?.productName, 160);
    const ingredients = Array.isArray(data?.ingredients)
      ? data.ingredients.map((item) => clean(item, 120)).filter(Boolean).slice(0, 80)
      : [];
    if (!category) throw new HttpsError('invalid-argument', 'A product category is required.');

    // Reuse products found by earlier searches before spending another web
    // search call. The client still recalculates the personal fit locally.
    const cached = await readCachedAlternatives(category).catch(() => []);
    if (cached.length > 0) {
      await db.collection('webAlternativeSearches').add({
        uid: context.uid,
        category,
        productName: productName || null,
        resultCount: cached.length,
        cached: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      return { alternatives: cached, searchedAt: new Date().toISOString(), cached: true };
    }
    if (!process.env.OPENAI_API_KEY) throw new HttpsError('failed-precondition', 'Web research is not configured yet.');

    const prompt = [
      `Find up to 6 currently sold ${category} products that are materially cleaner alternatives${productName ? ` to "${productName}"` : ''}.`,
      'Prioritize products with a short, recognizable ingredient list and no partially hydrogenated oils, trans fat, artificial colors, high-fructose corn syrup, or artificial sweeteners.',
      'Only include a product when you can find a public ingredient label or official product page. Do not invent ingredients, scores, URLs, or health claims.',
      'Estimate a Strictly Score of 90–100 using this rubric: ingredient quality 60%, level of processing 40%; critical ingredients tank the score and high-concern additives are heavily penalized. The score is a transparent ranking heuristic, not a medical or regulatory safety determination.',
      'Return the canonical product page or a reputable retailer page as sourceUrl. Keep reasons concise and explain why the product is a cleaner same-category match.',
      `Current label for context: ${ingredients.length ? ingredients.join(', ') : 'not available'}.`,
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-nano',
        reasoning: { effort: 'low' },
        tools: [{ type: 'web_search', search_context_size: 'low' }],
        tool_choice: 'required',
        input: [
          { role: 'system', content: 'You are Strictly research assistant. Be conservative, source-first, and never present guesses as facts.' },
          { role: 'user', content: prompt },
        ],
        text: { format: { type: 'json_schema', name: 'strictly_web_alternatives', strict: true, schema: alternativeSchema } },
        include: ['web_search_call.action.sources'],
        store: false,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error('OpenAI web alternative request failed', response.status, body.slice(0, 500));
      throw new HttpsError('unavailable', 'Web research is temporarily unavailable.');
    }

    const payload = parseResponseJson(await response.json());
    const alternatives = Array.isArray(payload?.alternatives) ? payload.alternatives : [];
    const result = alternatives
      .map((item) => ({
        productName: clean(item.productName, 160),
        brand: clean(item.brand, 100),
        ingredients: Array.isArray(item.ingredients) ? item.ingredients.map((ingredient) => clean(ingredient, 120)).filter(Boolean).slice(0, 80) : [],
        estimatedScore: clamp(item.estimatedScore),
        reason: clean(item.reason, 280),
        sourceUrl: clean(item.sourceUrl, 500),
        sourceTitle: clean(item.sourceTitle, 180),
      }))
      .filter((item) => item.productName && item.ingredients.length > 0 && item.estimatedScore >= 90 && /^https?:\/\//i.test(item.sourceUrl));

    const searchedAt = new Date().toISOString();
    await persistAlternatives(result, category, searchedAt).catch((error) => {
      console.error('Could not persist web alternatives', error);
    });

    await db.collection('webAlternativeSearches').add({
      uid: context.uid,
      category,
      productName: productName || null,
      resultCount: result.length,
      cached: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => undefined);

    return { alternatives: result, searchedAt, cached: false };
  }
);
