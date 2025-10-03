const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Proxy API requests to the API server
// Express strips /api from req.url when using app.use('/api', ...),
// so we need to add it back for the proxy
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:7071',
  pathRewrite: { '^/': '/api/' },  // Add /api prefix back
  changeOrigin: true,
  logLevel: 'silent'
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

const PORT = process.env.WEB_PORT || 8080;
app.listen(PORT, () => {
  console.log(`Static web server with API proxy running on http://localhost:${PORT}`);
});
