const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

/*
 Environment variables:
   AZURE_STORAGE_CONNECTION_STRING - connection string for the storage account
   SUBMISSIONS_CONTAINER - optional container name (defaults to "submissions")
*/

module.exports = async function (context, req) {
  context.log('Contact API called');

  if (!req.body) {
    context.res = { status: 400, body: 'Missing request body' };
    return;
  }

  const payload = req.body;

  // Validate basic fields
  if (!payload.email || !payload.name) {
    context.res = { status: 400, body: 'Missing required fields: name and email' };
    return;
  }

  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) {
    context.res = { status: 500, body: 'Server misconfigured: missing storage connection string' };
    return;
  }

  const containerName = process.env.SUBMISSIONS_CONTAINER || 'submissions';
  try {
    const blobSvc = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = blobSvc.getContainerClient(containerName);
    // create container if missing
    await containerClient.createIfNotExists({ access: 'container' });

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

    context.res = {
      status: 200,
      body: { ok: true, file: blobName }
    };
  } catch (err) {
    context.log.error('Error saving submission', err);
    context.res = { status: 500, body: 'Failed to save submission: ' + err.message };
  }
};
