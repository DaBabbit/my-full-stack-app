/**
 * Nextcloud WebDAV Upload Library - Server-Side (Node.js)
 * 
 * Server-seitige Upload-Funktionen für Next.js API Routes
 * Verwendet fetch() statt XMLHttpRequest
 */

export interface ServerUploadOptions {
  targetPath: string;       // WebDAV path where file should be uploaded
  username: string;
  password: string;
  baseUrl: string;         // Nextcloud base URL
  webdavPath: string;      // WebDAV endpoint path
}

/**
 * Upload file to Nextcloud from server-side (API route)
 * Uses fetch() which is available in Node.js 18+
 */
export async function uploadFileToNextcloud(
  fileBuffer: Buffer,
  fileName: string,
  options: ServerUploadOptions
): Promise<void> {
  const { targetPath, username, password, baseUrl, webdavPath } = options;

  // Construct full WebDAV URL
  const fullPath = `${targetPath}/${fileName}`;
  const uploadUrl = `${baseUrl}${webdavPath}/${fullPath}`;

  console.log('[Nextcloud Upload] Uploading to:', uploadUrl);

  // Create Basic Auth header
  const authString = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Nextcloud Upload] Upload failed:', response.status, errorText);
      throw new Error(`Nextcloud upload failed: ${response.status} ${response.statusText}`);
    }

    console.log('[Nextcloud Upload] Upload successful');
  } catch (error) {
    console.error('[Nextcloud Upload] Error:', error);
    throw error;
  }
}

/**
 * Create a directory on Nextcloud (MKCOL)
 */
export async function createNextcloudDirectory(
  dirPath: string,
  options: Omit<ServerUploadOptions, 'targetPath'>
): Promise<void> {
  const { username, password, baseUrl, webdavPath } = options;

  const dirUrl = `${baseUrl}${webdavPath}/${dirPath}`;
  const authString = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const response = await fetch(dirUrl, {
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    });

    // 405 means directory already exists - that's OK
    if (!response.ok && response.status !== 405) {
      const errorText = await response.text();
      console.error('[Nextcloud MKCOL] Failed:', response.status, errorText);
      throw new Error(`Failed to create directory: ${response.status} ${response.statusText}`);
    }

    console.log('[Nextcloud MKCOL] Directory created or already exists');
  } catch (error) {
    console.error('[Nextcloud MKCOL] Error:', error);
    throw error;
  }
}

