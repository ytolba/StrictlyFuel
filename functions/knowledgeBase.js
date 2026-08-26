const functions = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const SOURCE_REGISTRY = {
  fda_eafus: {
    name: 'FDA Substances Added to Food',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/food/food-additives-petitions/substances-added-food-formerly-eafus',
    sourceType: 'regulatory',
    license: 'Public government source; verify reuse terms before redistribution',
  },
  fda_gras: {
    name: 'FDA GRAS Notice Inventory',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/food/food-ingredients-packaging/generally-recognized-safe-gras',
    sourceType: 'regulatory',
    license: 'Public government source; verify reuse terms before redistribution',
  },
  usda_fooddata: {
    name: 'USDA FoodData Central',
    publisher: 'U.S. Department of Agriculture',
    url: 'https://fdc.nal.usda.gov/api-guide/',
    sourceType: 'government',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  open_food_facts: {
    name: 'Open Food Facts',
    publisher: 'Open Food Facts contributors',
    url: 'https://world.openfoodfacts.org/terms-of-use',
    sourceType: 'open_dataset',
    license: 'Open Database License (ODbL); attribution and share-alike obligations apply',
    licenseUrl: 'https://opendatacommons.org/licenses/odbl/summary/',
  },
  who_jecfa: {
    name: 'FAO/WHO JECFA evaluations',
    publisher: 'World Health Organization / Food and Agriculture Organization',
    url: 'https://apps.who.int/food-additives-contaminants-jecfa-database/Home',
    sourceType: 'research',
    license: 'Verify publication-specific rights before copying text',
  },
  efsa_openfoodtox: {
    name: 'EFSA OpenFoodTox',
    publisher: 'European Food Safety Authority',
    url: 'https://www.efsa.europa.eu/en/data-report/chemical-hazards-database-openfoodtox',
    sourceType: 'research',
    license: 'Verify dataset terms before redistribution',
  },
  nih_dsld: {
    name: 'NIH Dietary Supplement Label Database',
    publisher: 'National Institutes of Health Office of Dietary Supplements',
    url: 'https://ods.od.nih.gov/Research/Dietary_Supplement_Label_Database/',
    sourceType: 'government',
    license: 'CC0 1.0 for the label API',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  pubchem: {
    name: 'PubChem',
    publisher: 'National Center for Biotechnology Information',
    url: 'https://pubchem.ncbi.nlm.nih.gov/',
    sourceType: 'government',
    license: 'See PubChem data-use and attribution guidance',
  },
};

const normalize = (value = '') => String(value)
  .toLowerCase()
  .replace(/\([^)]*\)/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const cleanIngredients = (value) => [...new Set(
  (Array.isArray(value) ? value : String(value || '').split(','))
    .map((item) => normalize(item))
    .filter((item) => item.length > 2)
)].slice(0, 200);

const ensureSources = async (batch) => {
  Object.entries(SOURCE_REGISTRY).forEach(([id, source]) => {
    batch.set(db.collection('dataSources').doc(id), {
      id,
      ...source,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
};

exports.requestKnowledgeCuration = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in to request curation.');

  const ingredientNames = cleanIngredients(data && data.ingredientNames);
  const productId = data && data.productId ? String(data.productId).trim().slice(0, 64) : '';
  const scanId = data && data.scanId ? String(data.scanId).trim().slice(0, 128) : '';
  if (!ingredientNames.length && !productId) {
    throw new functions.https.HttpsError('invalid-argument', 'Provide a product ID or ingredient names.');
  }

  const jobRef = db.collection('curationJobs').doc();
  const batch = db.batch();
  await ensureSources(batch);
  batch.set(jobRef, {
    id: jobRef.id,
    type: productId ? 'product_ingest' : 'ingredient_enrichment',
    status: 'pending',
    requestedBy: context.auth.uid,
    scanId: scanId || null,
    productId: productId || null,
    ingredientNames,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  ingredientNames.forEach((normalizedName) => {
    const ingredientRef = db.collection('ingredientEntities').doc(normalizedName.replace(/ /g, '_'));
    const aliasRef = db.collection('ingredientAliases').doc(normalizedName);
    batch.set(ingredientRef, {
      id: ingredientRef.id,
      canonicalName: normalizedName,
      normalizedName,
      aliases: [],
      sourceIds: [],
      reviewStatus: 'needs_review',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(aliasRef, {
      normalizedName,
      ingredientId: ingredientRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();

  return { jobId: jobRef.id, status: 'pending' };
});

exports.enqueueKnowledgeCurationForScan = onDocumentCreated('scans/{scanId}', async (event) => {
    const scan = event.data?.data() || {};
    const ingredientNames = cleanIngredients(scan.ingredients);
    if (!ingredientNames.length) return null;

    const batch = db.batch();
    await ensureSources(batch);
    const jobRef = db.collection('curationJobs').doc(event.params.scanId);
    batch.set(jobRef, {
      id: jobRef.id,
      type: 'ingredient_enrichment',
      status: 'pending',
      scanId: event.params.scanId,
      ingredientNames,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    ingredientNames.forEach((normalizedName) => {
      const ingredientRef = db.collection('ingredientEntities').doc(normalizedName.replace(/ /g, '_'));
      const aliasRef = db.collection('ingredientAliases').doc(normalizedName);
      batch.set(ingredientRef, {
        id: ingredientRef.id,
        canonicalName: normalizedName,
        normalizedName,
        aliases: [],
        sourceIds: [],
        reviewStatus: 'needs_review',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.set(aliasRef, {
        normalizedName,
        ingredientId: ingredientRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
    return null;
  });

exports.enqueueProductKnowledge = onDocumentCreated('productScans/{barcode}', async (event) => {
    const product = event.data?.data() || {};
    const ingredientNames = cleanIngredients(product.ingredients);
    if (!ingredientNames.length) return null;

    const barcode = String(event.params.barcode);
    const batch = db.batch();
    await ensureSources(batch);
    batch.set(db.collection('productKnowledge').doc(barcode), {
      id: barcode,
      barcode,
      productName: product.productName || 'Unknown product',
      rawIngredients: Array.isArray(product.ingredients) ? product.ingredients.join(', ') : String(product.ingredients || ''),
      ingredientIds: ingredientNames.map((name) => name.replace(/ /g, '_')),
      ingredientNames,
      source: 'user_scan',
      reviewStatus: 'needs_review',
      knowledgeVersion: 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const jobRef = db.collection('curationJobs').doc(`product_${barcode}`);
    batch.set(jobRef, {
      id: jobRef.id,
      type: 'product_ingest',
      status: 'pending',
      productId: barcode,
      ingredientNames,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    ingredientNames.forEach((normalizedName) => {
      const ingredientRef = db.collection('ingredientEntities').doc(normalizedName.replace(/ /g, '_'));
      const aliasRef = db.collection('ingredientAliases').doc(normalizedName);
      batch.set(ingredientRef, {
        id: ingredientRef.id,
        canonicalName: normalizedName,
        normalizedName,
        aliases: [],
        sourceIds: [],
        reviewStatus: 'needs_review',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.set(aliasRef, {
        normalizedName,
        ingredientId: ingredientRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
    return null;
  });
