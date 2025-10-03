const { app } = require('@azure/functions');
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

app.http('contact', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'contact',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
        }

        context.log('Contact API called');

        const body = await request.json();

        if (!body) {
            return { 
                status: 400, 
                body: 'Missing request body',
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }

        const payload = body;

        // Validate basic fields
        if (!payload.email || !payload.name) {
            return { 
                status: 400, 
                body: 'Missing required fields: name and email',
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }

        // Accept multiple common environment variables
        const connStr =
            process.env.AZURE_STORAGE_CONNECTION_STRING ||
            process.env.AzureWebJobsStorage ||
            process.env.AZURE_STORAGE_CONNECTION_STRING_ALT ||
            process.env.WEBSITE_CONTENTAZUREFILECONNECTIONSTRING;

        if (!connStr) {
            context.log('No storage connection string found.');
            return {
                status: 500,
                body: 'Server misconfigured: missing storage connection string',
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }

        const containerName = process.env.SUBMISSIONS_CONTAINER || 'submissions';
        
        try {
            const requestId = uuidv4();
            context.log(`Submission request ${requestId} received for ${payload.email}`);
            
            const blobSvc = BlobServiceClient.fromConnectionString(connStr);
            const containerClient = blobSvc.getContainerClient(containerName);
            
            // create container if missing (private access)
            await containerClient.createIfNotExists();

            const id = uuidv4();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const blobName = `${timestamp}_${id}.json`;

            const content = JSON.stringify({
                id,
                ...payload
            }, null, 2);

            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.upload(content, Buffer.byteLength(content), {
                blobHTTPHeaders: { blobContentType: 'application/json' }
            });

            context.log(`Submission ${requestId} saved as ${blobName}`);
            
            return {
                status: 200,
                jsonBody: { ok: true, file: blobName, requestId },
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };
        } catch (err) {
            context.error('Error saving submission', err);
            const requestId = err.requestId || uuidv4();
            
            return {
                status: 500,
                jsonBody: {
                    ok: false,
                    requestId,
                    error: err && err.message ? err.message : String(err)
                },
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
    }
});
