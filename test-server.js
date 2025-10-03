const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const contactHandler = require('./api/contact/index.js');

// Load local settings for Azure Function
const settingsPath = path.join(__dirname, 'api', 'local.settings.json');
if (fs.existsSync(settingsPath)) {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  Object.assign(process.env, settings.Values);
  console.log('Loaded local.settings.json');
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/contact', async (req, res) => {
  // Create a proper context object for Azure Function
  const context = {
    res: null
  };
  
  // Add log function and its methods
  context.log = (...args) => console.log('[API]', ...args);
  context.log.error = (...args) => console.error('[API ERROR]', ...args);
  context.log.info = (...args) => console.log('[API INFO]', ...args);
  context.log.warn = (...args) => console.warn('[API WARN]', ...args);
  
  try {
    await contactHandler(context, { body: req.body });
    
    if (context.res) {
      res.status(context.res.status || 200).json(context.res.body);
    } else {
      res.status(500).json({ error: 'No response from handler' });
    }
  } catch (err) {
    console.error('Error in handler:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.API_PORT || 7071;
app.listen(PORT, () => {
  console.log(`Test API server running on http://localhost:${PORT}`);
});
