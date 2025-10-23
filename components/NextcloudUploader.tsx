'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FileUp, Trash2, AlertTriangle } from 'lucide-react';
import { uploadFiles, type UploadProgress } from '@/lib/nextcloud-upload';
import { supabase } from '@/utils/supabase';

interface NextcloudUploaderProps {
  videoId: string;
  videoName: string;
  nextcloudPath: string | undefined;
  onUploadSuccess?: (fileNames: string[]) => void; // Callback für Toast Notification
  onUploadError?: (errorMessage: string) => void; // Callback für Error Notification
}

export function NextcloudUploader({ videoId, nextcloudPath, onUploadSuccess, onUploadError }: NextcloudUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Map<string, UploadProgress>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-Upload Trigger
  useEffect(() => {
    if (pendingUpload && files.length > 0 && !uploading) {
      setPendingUpload(false);
      handleUpload();
    }
  }, [pendingUpload, files.length, uploading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || uploading) return;
    
    const newFiles = Array.from(selectedFiles);
    setFiles(prev => [...prev, ...newFiles]);
    setPendingUpload(true); // Trigger Auto-Upload
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
    setStartTime(Date.now());

    try {
      // 1. Session Token holen
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Keine aktive Session');
      }

      // 2. Credentials vom Backend holen
      console.log('[NextcloudUploader] 📤 Sende Request:', { videoId, nextcloudPath });
      
      const credentialsResponse = await fetch('/api/nextcloud/credentials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          videoId, 
          nextcloudPath 
        })
      });
      
      console.log('[NextcloudUploader] 📥 Response Status:', credentialsResponse.status);

      if (!credentialsResponse.ok) {
        const error = await credentialsResponse.json();
        throw new Error(error.error || 'Fehler beim Abrufen der Credentials');
      }

      const credentials = await credentialsResponse.json();

      // 3. Dateien uploaden
      await uploadFiles(
        files,
        {
          webdavUrl: credentials.webdavUrl,
          uploadsUrl: credentials.uploadsUrl,
          username: credentials.username,
          password: credentials.password,
          chunkSize: 10 * 1024 * 1024, // 10 MB chunks
          maxRetries: 3
        },
        (progress) => {
          setProgressMap(new Map(progress));
        }
      );

      // Success! Callback für Toast Notification
      const fileNames = files.map(f => f.name);
      if (onUploadSuccess) {
        onUploadSuccess(fileNames);
      }
      
      setFiles([]);
      setProgressMap(new Map());
      setStartTime(null);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload fehlgeschlagen';
      
      // Callback für Error Notification
      if (onUploadError) {
        onUploadError(errorMessage);
      } else {
        // Fallback: alert wenn kein Callback vorhanden
        alert(`❌ Fehler: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  // Berechne Gesamtfortschritt
  const calculateTotalProgress = () => {
    if (files.length === 0) return 0;
    
    let totalLoaded = 0;
    let totalSize = 0;
    
    files.forEach(file => {
      const progress = progressMap.get(file.name);
      totalSize += file.size;
      totalLoaded += progress?.loaded || 0;
    });
    
    return totalSize > 0 ? (totalLoaded / totalSize) * 100 : 0;
  };

  // Berechne geschätzte Restzeit
  const calculateEstimatedTime = () => {
    if (!startTime || !uploading) return null;
    
    const elapsed = (Date.now() - startTime) / 1000; // Sekunden
    const progress = calculateTotalProgress();
    
    if (progress <= 0) return null;
    
    const totalTime = (elapsed / progress) * 100;
    const remaining = totalTime - elapsed;
    
    if (remaining < 60) return `noch ~${Math.ceil(remaining)} Sekunden`;
    if (remaining < 3600) return `noch ~${Math.ceil(remaining / 60)} Minuten`;
    return `noch ~${Math.ceil(remaining / 3600)} Stunden`;
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

  const totalProgress = calculateTotalProgress();
  const estimatedTime = calculateEstimatedTime();

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all 
          ${uploading 
            ? 'border-neutral-700 bg-neutral-900/30 cursor-not-allowed opacity-50' 
            : isDragging 
              ? 'border-blue-500 bg-blue-500/10 cursor-pointer' 
              : 'border-neutral-600 hover:border-blue-500/50 bg-neutral-900/50 cursor-pointer'
          }
        `}
        onDrop={(e) => {
          e.preventDefault();
          if (uploading) return;
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
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

      {/* Upload Status - Gesamtfortschritt */}
      {uploading && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-white font-medium">
                Uploading {files.length} Datei(en)...
              </span>
            </div>
            {estimatedTime && (
              <span className="text-sm text-neutral-400">
                {estimatedTime}
              </span>
            )}
          </div>

          {/* Gesamtfortschritt Bar */}
          <div className="space-y-1">
            <div className="w-full bg-neutral-700 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <div className="text-right text-xs text-neutral-400">
              {totalProgress.toFixed(1)}%
            </div>
          </div>

          {/* Warnung */}
          <div className="flex items-start gap-2 text-yellow-400/80 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Bitte Fenster nicht schließen während des Uploads</span>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-300/80">
          💡 <span className="font-medium">Tipp:</span> Mehrere Dateien gleichzeitig hochladen möglich. 
          Die Dateien werden automatisch in deinem Video-Ordner gespeichert. 
          Zum Entfernen oder Verwalten der Dateien nutze den &quot;Speicherort&quot; Button.
        </p>
      </div>
    </div>
  );
}

