'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Loader2, FolderOpen, Download, AlertCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface VideoPreviewPlayerProps {
  videoId: string;
  storageLocation?: string;
  status: string;
}

interface FinishedFile {
  filename: string;
  path: string;
  size?: number;
}

export function VideoPreviewPlayer({ videoId, storageLocation, status }: VideoPreviewPlayerProps) {
  const [files, setFiles] = useState<FinishedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FinishedFile | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Nur anzeigen bei Status "Schnitt abgeschlossen" oder "Hochgeladen"
  const shouldShowPlayer = status === 'Schnitt abgeschlossen' || status === 'Hochgeladen';

  // Lade verfügbare fertige Videos
  useEffect(() => {
    if (!shouldShowPlayer) return;

    async function loadFinishedVideos() {
      setLoading(true);
      setError(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Keine aktive Session');
          return;
        }

        const response = await fetch(`/api/nextcloud/videos/${videoId}/finished`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Videos');
        }

        const data = await response.json();
        const mp4Files = data.files || [];
        setFiles(mp4Files);
        
        // Automatisch erste Datei auswählen falls vorhanden
        if (mp4Files.length > 0) {
          setSelectedFile(mp4Files[0]);
        } else {
          setError('Kein fertiges Video gefunden');
        }
      } catch (err) {
        console.error('[VideoPreview] Error loading files:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    }

    loadFinishedVideos();
  }, [videoId, shouldShowPlayer]);

  // Lade Streaming-URL für ausgewählte Datei
  useEffect(() => {
    if (!selectedFile) return;

    async function loadStreamUrl() {
      setLoading(true);
      setError(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Keine aktive Session');
          return;
        }

        const response = await fetch('/api/nextcloud/shares', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            videoId,
            filename: selectedFile.filename
          })
        });

        if (!response.ok) {
          throw new Error('Stream-URL konnte nicht geladen werden');
        }

        const data = await response.json();
        setStreamUrl(data.downloadUrl);
      } catch (err) {
        console.error('[VideoPreview] Error loading stream URL:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Stream-URL');
      } finally {
        setLoading(false);
      }
    }

    loadStreamUrl();
  }, [videoId, selectedFile]);

  // Formatiere Dateigröße
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Handler für Download
  const handleDownload = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Handler für Speicherort öffnen
  const handleOpenStorage = () => {
    if (storageLocation) {
      window.open(storageLocation, '_blank', 'noopener,noreferrer');
    }
  };

  if (!shouldShowPlayer) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-neutral-300">Video-Vorschau</h4>
        {selectedFile && (
          <span className="text-xs text-neutral-500">
            {formatFileSize(selectedFile.size)}
          </span>
        )}
      </div>

      {/* Datei-Auswahl (falls mehrere Videos) */}
      {files.length > 1 && (
        <select
          value={selectedFile?.filename || ''}
          onChange={(e) => {
            const file = files.find(f => f.filename === e.target.value);
            if (file) setSelectedFile(file);
          }}
          className="w-full p-2 bg-neutral-800 text-white text-sm rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
        >
          {files.map(file => (
            <option key={file.filename} value={file.filename}>
              {file.filename}
            </option>
          ))}
        </select>
      )}

      {/* Loading State */}
      {loading && !streamUrl && (
        <div className="flex items-center justify-center p-8 bg-neutral-800/50 rounded-lg border border-neutral-700">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      )}

      {/* Error State */}
      {error && !streamUrl && (
        <div className="flex items-start gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-300">{error}</p>
            {!storageLocation && (
              <p className="text-xs text-orange-400 mt-1">
                Kein Speicherort verfügbar. Bitte warten Sie, bis der Ordner erstellt wurde.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Video Player */}
      {streamUrl && !error && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden border border-neutral-700">
            <video
              ref={videoRef}
              src={streamUrl}
              controls
              className="w-full h-auto"
              playsInline
              preload="metadata"
            >
              Ihr Browser unterstützt das Video-Element nicht.
            </video>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleOpenStorage}
              disabled={!storageLocation}
              className="flex items-center justify-center gap-2 p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Speicherort öffnen"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Speicherort</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20 text-sm"
              title="Video herunterladen"
            >
              <Download className="w-4 h-4" />
              <span>Herunterladen</span>
            </button>
          </div>
        </div>
      )}

      {/* Info wenn noch kein Video */}
      {!loading && files.length === 0 && !error && (
        <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700 text-center">
          <Play className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">
            Noch kein fertiges Video verfügbar
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Laden Sie ein Video in den Ordner &quot;Fertiges_Video&quot; hoch
          </p>
        </div>
      )}
    </div>
  );
}

