module.exports = async (req, res) => {

  // ── TikTok webhook challenge (GET)
  if (req.method === 'GET' && req.query.challenge) {
    return res.status(200).json({ challenge: req.query.challenge });
  }

  // ── Stripe session verification (GET /api/webhook?verify=cs_xxx)
  if (req.method === 'GET' && req.query.verify) {
    const sessionId = req.query.verify;

    // Must start with cs_live_ or cs_test_
    if (!sessionId.startsWith('cs_live_') && !sessionId.startsWith('cs_test_')) {
      return res.status(400).json({ valid: false, error: 'Invalid session format' });
    }

    // If no Stripe key configured, grant access anyway (fail open for now)
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('WARNING: No STRIPE_SECRET_KEY set — granting access without verification');
      return res.status(200).json({
        valid: true,
        email: '',
        name: 'CoinDrop User',
        sessionId: sessionId,
        warning: 'unverified'
      });
    }

    try {
      const stripeRes = await fetch(
        'https://api.stripe.com/v1/checkout/sessions/' + sessionId,
        {
          headers: {
            'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY
          }
        }
      );
      const session = await stripeRes.json();

      if (session.error) {
        console.log('Stripe error:', session.error);
        // Still grant access if it looks like a real session ID — fail open
        return res.status(200).json({
          valid: true,
          email: '',
          name: 'CoinDrop User',
          sessionId: sessionId,
          warning: 'stripe_error'
        });
      }

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ valid: false, error: 'Payment not completed' });
      }

      return res.status(200).json({
        valid: true,
        email: session.customer_details?.email || '',
        name: session.customer_details?.name || 'CoinDrop User',
        sessionId: session.id
      });

    } catch (err) {
      console.log('Verification error:', err.message);
      // Fail open — grant access if we can't reach Stripe
      return res.status(200).json({
        valid: true,
        email: '',
        name: 'CoinDrop User',
        sessionId: sessionId,
        warning: 'verification_error'
      });
    }
  }

  // ── TikTok LIVE gift events (POST)
  if (req.method === 'POST') {
    try {
      const event = req.body || {};
      if (event.event === 'live.gift') {
        const name  = (event.data?.user?.display_name) || 'Anonymous';
        const coins = (event.data?.gift?.coin_count)   || 0;
        console.log('Gift: ' + name + ' sent ' + coins + ' coins');
      }
    } catch (e) {}
    return res.status(200).json({ received: true });
  }

  return res.status(200).json({ status: 'CoinDrop webhook active' });
};
