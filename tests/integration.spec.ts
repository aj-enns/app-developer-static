import { test, expect } from '@playwright/test';
import { BlobServiceClient } from '@azure/storage-blob';

test.beforeEach(async ({ page }) => {
  // Route API calls from the static site to the API server
  await page.route('**/api/contact', async (route) => {
    const request = route.request();
    const postData = request.postData();
    
    // Forward to the actual API server
    const response = await page.request.post('http://localhost:7071/api/contact', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: postData
    });
    
    const body = await response.text();
    route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: body
    });
  });
});

test('submitting the contact form saves to Azure Storage and shows success', async ({ page }) => {
  await page.goto('/');

  // Fill out the form
  await page.fill('input[name="name"]', 'E2E Test User');
  await page.fill('input[name="email"]', 'e2e@example.com');
  await page.fill('input[name="title"]', 'Integration Test');
  await page.selectOption('select[name="iosVersion"]', 'iOS 17');
  await page.check('input[name="devices"][value="iPhone"]');
  await page.check('input[name="devices"][value="iPad"]');
  await page.fill('textarea[name="message"]', 'This is a full integration test of the comment saving functionality.');

  // Submit the form and wait for response
  await Promise.all([
    page.waitForResponse('**/api/contact'),
    page.click('button[type="submit"]')
  ]);

  // Verify the toast shows success
  const toast = page.locator('#toast');
  await expect(toast).toHaveText(/Thanks — your message was saved./);
  await expect(toast).toHaveClass(/show/);

  // Verify the form was reset
  await expect(page.locator('input[name="name"]')).toHaveValue('');
  await expect(page.locator('input[name="email"]')).toHaveValue('');

  // Verify data was actually saved to Azure Storage
  const connectionString = 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;';
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient('submissions');
  
  // List all blobs and find the one we just created
  let foundBlob = false;
  let blobContent: any = null;
  
  for await (const blob of containerClient.listBlobsFlat()) {
    const blobClient = containerClient.getBlobClient(blob.name);
    const downloadResponse = await blobClient.download();
    const downloaded = await streamToString(downloadResponse.readableStreamBody!);
    const data = JSON.parse(downloaded);
    
    if (data.email === 'e2e@example.com' && data.name === 'E2E Test User') {
      foundBlob = true;
      blobContent = data;
      break;
    }
  }
  
  expect(foundBlob).toBe(true);
  expect(blobContent).not.toBeNull();
  expect(blobContent.name).toBe('E2E Test User');
  expect(blobContent.email).toBe('e2e@example.com');
  expect(blobContent.title).toBe('Integration Test');
  expect(blobContent.iosVersion).toBe('iOS 17');
  expect(blobContent.devices).toContain('iPhone');
  expect(blobContent.devices).toContain('iPad');
  expect(blobContent.message).toContain('full integration test');
  expect(blobContent.id).toBeDefined();
  expect(blobContent.submittedAt).toBeDefined();
});

// Helper function to convert stream to string
async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    readableStream.on('error', reject);
  });
}
