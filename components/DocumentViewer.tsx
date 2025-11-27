import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Calendar, PlayCircle } from 'lucide-react';
import { DocRecord } from '../types';

interface DocumentViewerProps {
  doc: DocRecord;
  onBack: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ doc, onBack }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (doc.mediaBlob) {
      const url = URL.createObjectURL(doc.mediaBlob);
      setMediaUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [doc]);


  const renderMedia = () => {
    if (!mediaUrl || !doc.mediaType) return null;

    if (doc.mediaType.startsWith('video/')) {
      return (
        <video controls className="w-full rounded-lg shadow-xl bg-black max-h-[500px]">
          <source src={mediaUrl} type={doc.mediaType} />
          Your browser does not support the video tag.
        </video>
      );
    }
    if (doc.mediaType.startsWith('audio/')) {
      return (
        <div className="bg-surface p-6 rounded-xl border border-slate-700 flex items-center justify-center">
            <audio controls className="w-full">
            <source src={mediaUrl} type={doc.mediaType} />
            Your browser does not support the audio element.
            </audio>
        </div>
      );
    }
    if (doc.mediaType.startsWith('image/')) {
      return <img src={mediaUrl} alt="Attached Media" className="max-w-full rounded-lg shadow-lg max-h-[500px] object-contain mx-auto" />;
    }
    return <div className="p-4 bg-slate-800 rounded text-center">Unsupported media type: {doc.mediaType}</div>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6 shrink-0">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="text-slate-300" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white truncate max-w-2xl">{doc.title}</h2>
          <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
            <span className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
            </span>
            {doc.mediaType && (
              <span className="flex items-center space-x-1 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
                <PlayCircle size={12} />
                <span>Media Attached</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex flex-col space-y-6">
          {/* Media Section */}
          {doc.mediaBlob && (
            <div className="shrink-0">
              {renderMedia()}
            </div>
          )}

          {/* Text Content */}
          <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-primary">
                <FileText size={18}/> <span>文本内容</span>
            </h3>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-mono text-slate-300">
              {doc.content || <span className="italic text-slate-500">No text content available.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};