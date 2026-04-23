function verifyWebhookAuth(req, res, next) {
  const expected = process.env.WEBHOOK_SHARED_SECRET;

  if (!expected) {
    return res.status(500).json({
      error: 'WEBHOOK_SHARED_SECRET is not configured.'
    });
  }

  const token = req.header('x-dayliff-webhook-token');

  if (!token || token !== expected) {
    return res.status(401).json({
      error: 'Unauthorized webhook request.'
    });
  }

  return next();
}

module.exports = { verifyWebhookAuth };
