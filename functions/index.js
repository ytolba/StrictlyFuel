const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.createPaymentRedirect = functions.https.onRequest((req, res) => {
  const stripePaymentLink = 'https://buy.stripe.com/test_8wMaIwbK315t6NaaEE'; // Your Stripe Payment Link
  const successUrl = 'yourapp://success'; // Deep link to handle success
  const cancelUrl = 'yourapp://cancel'; // Deep link to handle cancellation

  const fullPaymentUrl = `${stripePaymentLink}?success_url=${encodeURIComponent(
    successUrl
  )}&cancel_url=${encodeURIComponent(cancelUrl)}`;

  res.redirect(fullPaymentUrl); // Redirect user to the Stripe Payment Link
});
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
  try {
    const sessionId = req.body.sessionId; // Pass session ID from the frontend (if using Stripe Checkout Sessions)
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID.' });
    }

    // Retrieve session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Update user data in Firestore (e.g., mark as premium)
      const userId = req.body.userId; // Pass user ID from the frontend
      if (!userId) {
        return res.status(400).json({ error: 'Missing user ID.' });
      }
      const userRef = admin.firestore().collection('users').doc(userId); // Example based on user ID
      await userRef.update({ isPremium: true });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Payment not completed.' });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// Knowledge-base ingestion and provenance-aware curation queue.
Object.assign(exports, require('./knowledgeBase'));
Object.assign(exports, require('./webAlternatives'));
Object.assign(exports, require('./mealAnalysis'));
