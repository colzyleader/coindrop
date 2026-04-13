module.exports = (req, res) => {
  const code  = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.redirect('/?error=tiktok_auth_failed');
  }
  if (code) {
    // TODO: exchange code for access token
    return res.redirect('/?connected=true');
  }
  return res.status(200).json({ status: 'CoinDrop callback active' });
};
