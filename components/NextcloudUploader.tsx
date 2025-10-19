'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FileUp, Trash2 } from 'lucide-react';
import { uploadFiles, type UploadProgress } from '@/lib/nextcloud-upload';

interface NextcloudUploaderProps {
  videoId: string;
  videoName: string; // Used for user feedback in alerts
  nextcloudPath: string | undefined;
}

export function NextcloudUploader({ videoId, nextcloudPath }: NextcloudUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Map<string, UploadProgress>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const newFiles = Array.from(selectedFiles);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    if (!nextcloudPath) {
      alert('❌ Fehler: Kein Nextcloud-Pfad vorhanden. Bitte warte bis N8N den Ordner erstellt hat.');
      return;
    }

    setUploading(true);
    setProgressMap(new Map());

    try {
      // 1. Credentials vom Backend holen
      const credentialsResponse = await fetch('/api/nextcloud/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoId, 
          nextcloudPath 
        })
      });

      if (!credentialsResponse.ok) {
        const error = await credentialsResponse.json();
        throw new Error(error.error || 'Fehler beim Abrufen der Credentials');
      }

      const credentials = await credentialsResponse.json();

      // 2. Dateien uploaden
      await uploadFiles(
        files,
        {
          webdavUrl: credentials.webdavUrl,
          username: credentials.username,
          password: credentials.password,
          chunkSize: 10 * 1024 * 1024, // 10 MB chunks
          maxRetries: 3
        },
        (progress) => {
          setProgressMap(new Map(progress));
        }
      );

      // Success!
      alert(`✅ ${files.length} Datei(en) erfolgreich hochgeladen!`);
      setFiles([]);
      setProgressMap(new Map());

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload fehlgeschlagen';
      alert(`❌ Fehler: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStatusIcon = (status?: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-neutral-600 hover:border-blue-500/50 bg-neutral-900/50'
          }
        `}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center">
          {isDragging ? (
            <FileUp className="w-12 h-12 text-blue-400 mb-4 animate-bounce" />
          ) : (
            <Upload className="w-12 h-12 text-neutral-400 mb-4" />
          )}
          
          <p className="text-neutral-300 font-medium mb-2">
            {isDragging ? 'Dateien jetzt ablegen' : 'Dateien hier ablegen oder klicken'}
          </p>
          
          <p className="text-neutral-500 text-sm">
            Rohmaterial, Schnitt-Projekte, fertige Videos, Thumbnails
          </p>
          
          <p className="text-neutral-600 text-xs mt-2">
            Mehrere Dateien gleichzeitig möglich • Große Dateien werden in Chunks hochgeladen
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-neutral-300">
              {files.length} Datei(en) ausgewählt
            </h4>
            {!uploading && (
              <button
                onClick={() => setFiles([])}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Alle entfernen
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {files.map((file, idx) => {
              const progress = progressMap.get(file.name);
              
              return (
                <div
                  key={idx}
                  className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getStatusIcon(progress?.status)}
                      <span className="text-sm text-neutral-300 truncate">
                        {file.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">
                        {formatFileSize(file.size)}
                      </span>
                      
                      {!uploading && (
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1 hover:bg-neutral-700 rounded transition-colors"
                          title="Entfernen"
                        >
                          <Trash2 className="w-3 h-3 text-neutral-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {progress && progress.status === 'uploading' && (
                    <div className="space-y-1">
                      <div className="w-full bg-neutral-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{progress.percentage.toFixed(1)}%</span>
                        <span>
                          {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {progress && progress.status === 'error' && progress.error && (
                    <p className="text-xs text-red-400 mt-1">
                      {progress.error}
                    </p>
                  )}

                  {/* Completed */}
                  {progress && progress.status === 'completed' && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Upload abgeschlossen
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading {files.length} Datei(en)...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>{files.length} Datei(en) hochladen</span>
            </>
          )}
        </button>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-300/80">
          💡 <span className="font-medium">Tipp:</span> Uploads erfolgen direkt zu Nextcloud ohne Vercel-Bandwidth zu belasten. 
          Große Dateien werden automatisch in 10 MB Chunks aufgeteilt.
        </p>
      </div>
    </div>
  );
}

