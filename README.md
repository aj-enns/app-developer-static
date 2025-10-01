# app-developer-static

Simple static site and Azure Functions API for an iOS app developer. The site includes a contact form that saves each submission as a JSON file in Azure Blob Storage.

What's included
- `index.html`, `styles.css`, `app.js` — static frontend with a contact form targeted to iOS app projects.
- `api/contact/` — Azure Function (Node) that accepts form POSTs and saves submissions to Azure Blob Storage as individual JSON files.
- `.github/workflows/azure-static-web-apps.yml` — GitHub Actions workflow stub for deploying to Azure Static Web Apps.

Quick local run
1. Install API dependencies:

```bash
cd api
npm install
```

2. Run the Azure Functions runtime locally (optional, requires Azure Functions Core Tools):

```bash
func start
```

3. Serve the static files (from repo root):

```bash
# Python 3
python3 -m http.server 8080
```

Open `http://localhost:8080` and submit the form. When testing locally you'll typically run the Functions runtime on `http://localhost:7071` and adjust the endpoint in `app.js` or use a proxy.

Azure deployment (high level)
1. Create an Azure Storage Account and get its connection string.
2. Create an Azure Static Web App and connect it to this repo (or set up the GitHub Action secret `AZURE_STATIC_WEB_APPS_API_TOKEN`).
3. In the Static Web App (or Function App) configuration, set `AZURE_STORAGE_CONNECTION_STRING` to the storage connection string.
4. Push to `main` to trigger the GitHub Action.

Test the API locally (when `func start` is running):

```bash
curl -X POST http://localhost:7071/api/contact \
	-H "Content-Type: application/json" \
	-d '{"name":"Test","email":"test@example.com","message":"Hello"}'
```

Contract
- Input: POST JSON to `/api/contact` with at least `name` and `email`.
- Success: HTTP 200 with JSON `{ ok: true, file: "<blobName>" }`.
- Errors: 400 on bad input, 500 on server/storage errors.

Security notes
- Keep `AZURE_STORAGE_CONNECTION_STRING` secret (use app settings / GitHub secrets).
- Consider adding CAPTCHA or rate-limiting to reduce spam.

If you'd like, I can add reCAPTCHA, change the storage backend (Table/Cosmos DB), or make the function TypeScript with tests.
# app-developer-static