/**
 * Nextcloud WebDAV Upload Library
 * 
 * Implementiert Nextcloud Chunked Upload v2:
 * - MKCOL: Erstelle temporären Upload-Ordner
 * - PUT: Lade Chunks hoch
 * - MOVE: Verschiebe finale Datei zum Zielort
 * - Progress Tracking
 * - Retry Logic bei Fehlern
 */

export interface UploadProgress {
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadOptions {
  webdavUrl: string;        // Final destination path
  uploadsUrl: string;       // Temporary uploads path
  username: string;
  password: string;
  onProgress?: (progress: UploadProgress) => void;
  chunkSize?: number;
  maxRetries?: number;
}

/**
 * Hilfsfunktion: Sleep für Retry-Delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload einer einzelnen Datei mit Nextcloud Chunked Upload
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<void> {
  const {
    webdavUrl,
    uploadsUrl,
    username,
    password,
    onProgress,
    chunkSize = 10 * 1024 * 1024, // 10 MB default
    maxRetries = 3
  } = options;

  const filename = file.name;
  const fileSize = file.size;

  // Progress initialisieren
  const updateProgress = (loaded: number, status: UploadProgress['status'], error?: string) => {
    if (onProgress) {
      onProgress({
        filename,
        loaded,
        total: fileSize,
        percentage: (loaded / fileSize) * 100,
        status,
        error
      });
    }
  };

  updateProgress(0, 'pending');

  try {
    // Kleine Dateien (< 10 MB): direkter Upload
    if (fileSize <= chunkSize) {
      await uploadDirect(file, webdavUrl, username, password, updateProgress, maxRetries);
    } else {
      // Große Dateien: Nextcloud Chunked Upload (MKCOL → PUT → MOVE)
      await uploadNextcloudChunked(
        file,
        webdavUrl,
        uploadsUrl,
        username,
        password,
        chunkSize,
        updateProgress,
        maxRetries
      );
    }

    updateProgress(fileSize, 'completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload fehlgeschlagen';
    updateProgress(0, 'error', errorMessage);
    throw error;
  }
}

/**
 * Direkter Upload für kleinere Dateien
 */
async function uploadDirect(
  file: File,
  webdavUrl: string,
  username: string,
  password: string,
  updateProgress: (loaded: number, status: UploadProgress['status']) => void,
  maxRetries: number
): Promise<void> {
  const uploadUrl = `${webdavUrl}/${encodeURIComponent(file.name)}`;
  
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      updateProgress(0, 'uploading');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Progress Tracking
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            updateProgress(e.loaded, 'uploading');
          }
        });

        // Success
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        // Error
        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        // Send Request
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader(
          'Authorization',
          `Basic ${btoa(`${username}:${password}`)}`
        );
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      return; // Success - exit loop
    } catch (error) {
      retries++;
      
      if (retries > maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
      console.warn(`Upload retry ${retries}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }
}

/**
 * Nextcloud Chunked Upload für große Dateien
 * Flow: MKCOL → PUT chunks → MOVE
 */
async function uploadNextcloudChunked(
  file: File,
  finalUrl: string,
  uploadsBaseUrl: string,
  username: string,
  password: string,
  chunkSize: number,
  updateProgress: (loaded: number, status: UploadProgress['status']) => void,
  maxRetries: number
): Promise<void> {
  // 1. Erstelle eindeutige Upload-ID
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const uploadFolderUrl = `${uploadsBaseUrl}/${uploadId}`;
  
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedBytes = 0;

  updateProgress(0, 'uploading');

  try {
    // 2. MKCOL: Erstelle temporären Upload-Ordner
    await makeCollection(uploadFolderUrl, username, password);

    // 3. PUT: Lade alle Chunks hoch
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      // Chunk-Dateiname: 00000000, 00000001, ...
      const chunkName = chunkIndex.toString().padStart(8, '0');
      const chunkUrl = `${uploadFolderUrl}/${chunkName}`;

      let retries = 0;
      while (retries <= maxRetries) {
        try {
          await uploadChunkDirect(chunk, chunkUrl, username, password);
          uploadedBytes += chunk.size;
          updateProgress(uploadedBytes, 'uploading');
          break; // Success
        } catch {
          retries++;
          if (retries > maxRetries) {
            throw new Error(`Chunk ${chunkIndex + 1}/${totalChunks} failed after ${maxRetries} retries`);
          }
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
          await sleep(delay);
        }
      }
    }

    // 4. MOVE: Verschiebe finale Datei zum Zielort
    const sourceUrl = `${uploadFolderUrl}/.file`;
    const destinationUrl = `${finalUrl}/${encodeURIComponent(file.name)}`;
    await moveFile(sourceUrl, destinationUrl, username, password);

  } catch (error) {
    // Cleanup: Versuche Upload-Ordner zu löschen
    try {
      await deleteCollection(uploadFolderUrl, username, password);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * MKCOL: Erstelle WebDAV Collection (Ordner)
 */
async function makeCollection(
  url: string,
  username: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`MKCOL failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('MKCOL network error')));
    xhr.open('MKCOL', url);
    xhr.setRequestHeader('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
    xhr.send();
  });
}

/**
 * PUT: Lade einzelnen Chunk hoch
 */
async function uploadChunkDirect(
  chunk: Blob,
  url: string,
  username: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Chunk PUT failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Chunk network error')));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(chunk);
  });
}

/**
 * MOVE: Verschiebe Datei zum finalen Ziel
 */
async function moveFile(
  sourceUrl: string,
  destinationUrl: string,
  username: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`MOVE failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('MOVE network error')));
    xhr.open('MOVE', sourceUrl);
    xhr.setRequestHeader('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
    xhr.setRequestHeader('Destination', destinationUrl);
    xhr.setRequestHeader('Overwrite', 'T');
    xhr.send();
  });
}

/**
 * DELETE: Lösche Collection (Cleanup)
 */
async function deleteCollection(
  url: string,
  username: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`DELETE failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('DELETE network error')));
    xhr.open('DELETE', url);
    xhr.setRequestHeader('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
    xhr.send();
  });
}

/**
 * Upload mehrerer Dateien parallel
 */
export async function uploadFiles(
  files: File[],
  options: Omit<UploadOptions, 'onProgress'>,
  onProgress?: (progressMap: Map<string, UploadProgress>) => void
): Promise<void> {
  const progressMap = new Map<string, UploadProgress>();

  // Progress Tracking für alle Dateien
  const createProgressHandler = (filename: string) => {
    return (progress: UploadProgress) => {
      progressMap.set(filename, progress);
      if (onProgress) {
        onProgress(new Map(progressMap));
      }
    };
  };

  // Alle Dateien parallel uploaden
  await Promise.all(
    files.map(file => 
      uploadFile(file, {
        ...options,
        onProgress: createProgressHandler(file.name)
      }).catch(() => {
        // Errors are already tracked in progressMap via onProgress callback
        // Individual file errors don't stop other uploads
      })
    )
  );
}

