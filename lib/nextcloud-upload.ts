/**
 * Nextcloud WebDAV Upload Library
 * 
 * Robuste Upload-Lösung mit:
 * - Chunked Uploads für große Dateien
 * - Progress Tracking
 * - Retry Logic bei Fehlern
 * - Parallel Uploads für mehrere Dateien
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
  webdavUrl: string;
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
 * Upload einer einzelnen Datei mit Chunking und Retry
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<void> {
  const {
    webdavUrl,
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
    // Kleine Dateien: direkter Upload
    if (fileSize <= chunkSize) {
      await uploadDirect(file, webdavUrl, username, password, updateProgress, maxRetries);
    } else {
      // Große Dateien: Chunked Upload
      await uploadChunked(file, webdavUrl, username, password, chunkSize, updateProgress, maxRetries);
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
 * Chunked Upload für große Dateien
 */
async function uploadChunked(
  file: File,
  webdavUrl: string,
  username: string,
  password: string,
  chunkSize: number,
  updateProgress: (loaded: number, status: UploadProgress['status']) => void,
  maxRetries: number
): Promise<void> {
  const uploadUrl = `${webdavUrl}/${encodeURIComponent(file.name)}`;
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedBytes = 0;

  updateProgress(0, 'uploading');

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    let retries = 0;

    while (retries <= maxRetries) {
      try {
        await uploadChunk(
          chunk,
          uploadUrl,
          username,
          password,
          start,
          end - 1,
          file.size
        );

        uploadedBytes += chunk.size;
        updateProgress(uploadedBytes, 'uploading');
        break; // Success - next chunk
      } catch (error) {
        retries++;
        
        if (retries > maxRetries) {
          throw new Error(`Chunk ${chunkIndex + 1}/${totalChunks} failed after ${maxRetries} retries`);
        }

        const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
        console.warn(`Chunk ${chunkIndex + 1} retry ${retries}/${maxRetries}`);
        await sleep(delay);
      }
    }
  }
}

/**
 * Upload eines einzelnen Chunks
 */
async function uploadChunk(
  chunk: Blob,
  uploadUrl: string,
  username: string,
  password: string,
  start: number,
  end: number,
  total: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Chunk upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Chunk network error')));
    xhr.addEventListener('abort', () => reject(new Error('Chunk upload aborted')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader(
      'Authorization',
      `Basic ${btoa(`${username}:${password}`)}`
    );
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    xhr.send(chunk);
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
      })
    )
  );
}

