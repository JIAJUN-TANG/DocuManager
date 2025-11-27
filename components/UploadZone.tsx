import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, ArrowLeft, FileText, Film, Music, Image as ImageIcon, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DocRecord } from '../types';
import { saveDocument, getAllDocuments } from '../services/db';
import mammoth from 'mammoth';

const SUPPORTED_TEXT_EXT = ['txt', 'md', 'json', 'log', 'csv', 'doc', 'docx'];
const SUPPORTED_MEDIA_EXT = ['mp4', 'mp3', 'png', 'jpg', 'jpeg', 'webm', 'wav', 'tif', 'tiff'];

interface FilePreview {
  id: string;
  file: File;
  type: 'text' | 'media' | 'unknown';
  content?: string;
  metadata: {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
  };
  linkedTo?: string; // ID of another file to link with
}

interface UploadZoneProps {
  onUploadComplete: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [existingTextDocs, setExistingTextDocs] = useState<DocRecord[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Load existing text documents from database when component mounts or step changes to preview
  useEffect(() => {
    const loadExistingTextDocs = async () => {
      if (step === 'preview') {
        try {
          const allDocs = await getAllDocuments();
          // Filter to only include text documents (no media blob)
          const textDocs = allDocs.filter(doc => !doc.mediaBlob);
          setExistingTextDocs(textDocs);
        } catch (error) {
          console.error('Failed to load existing text documents:', error);
        }
      }
    };

    loadExistingTextDocs();
  }, [step]);

  const getFileIcon = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (SUPPORTED_TEXT_EXT.includes(ext)) {
      return <FileText className="w-6 h-6 text-blue-400" />;
    } else if (ext === 'mp4' || ext === 'webm') {
      return <Film className="w-6 h-6 text-purple-400" />;
    } else if (ext === 'mp3' || ext === 'wav') {
      return <Music className="w-6 h-6 text-green-400" />;
    } else if (['png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(ext)) {
      return <ImageIcon className="w-6 h-6 text-red-400" />;
    }
    return <FileText className="w-6 h-6 text-gray-400" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processFileForPreview = async (file: File): Promise<FilePreview> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let type: 'text' | 'media' | 'unknown' = 'unknown';
    let content: string | undefined;

    if (SUPPORTED_TEXT_EXT.includes(ext)) {
      type = 'text';
      if (ext === 'doc' || ext === 'docx') {
        // Use mammoth to extract text from Word documents
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value || `[Word document: ${file.name}]`;
        } catch (error) {
          console.error('Failed to extract text from Word document:', error);
          content = `[Word document: ${file.name}]`;
        }
      } else {
        content = await file.text();
      }
    } else if (SUPPORTED_MEDIA_EXT.includes(ext)) {
      type = 'media';
    }

    return {
      id: uuidv4(),
      file,
      type,
      content,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      }
    };
  };

  // Calculate text similarity using Levenshtein distance
  const calculateSimilarity = (text1: string, text2: string): number => {
    const a = text1.toLowerCase();
    const b = text2.toLowerCase();
    
    // Remove file extensions and common words
    const cleanText = (text: string) => {
      return text.replace(/\.[^/.]+$/, '') // Remove extension
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
    };
    
    const s1 = cleanText(a);
    const s2 = cleanText(b);
    
    // Simple similarity score based on common prefix and suffix
    let score = 0;
    
    // Check if one is a substring of the other
    if (s1.includes(s2) || s2.includes(s1)) {
      score += 70;
    }
    
    // Check for common prefix
    const minLength = Math.min(s1.length, s2.length);
    let commonPrefix = 0;
    for (let i = 0; i < minLength; i++) {
      if (s1[i] === s2[i]) {
        commonPrefix++;
      } else {
        break;
      }
    }
    score += (commonPrefix / minLength) * 30;
    
    return Math.round(score);
  };

  // Group files by similarity
  const groupFilesBySimilarity = (filePreviews: FilePreview[]) => {
    const textFiles = filePreviews.filter(f => f.type === 'text');
    const mediaFiles = filePreviews.filter(f => f.type === 'media');
    
    const groups: Array<{text?: FilePreview, media: FilePreview[], similarity: number}> = [];
    
    // First, try exact name matching
    for (const textFile of textFiles) {
      const baseName = textFile.metadata.name.replace(/\.[^/.]+$/, '');
      const matchingMedia = mediaFiles.filter(media => {
        const mediaBaseName = media.metadata.name.replace(/\.[^/.]+$/, '');
        return mediaBaseName === baseName;
      });
      
      if (matchingMedia.length > 0) {
        groups.push({
          text: textFile,
          media: matchingMedia,
          similarity: 100
        });
      }
    }
    
    // Then, try similarity matching for remaining files
    const usedTextFiles = new Set(groups.map(g => g.text?.id));
    const usedMediaFiles = new Set(groups.flatMap(g => g.media.map(m => m.id)));
    
    for (const textFile of textFiles) {
      if (usedTextFiles.has(textFile.id)) continue;
      
      for (const mediaFile of mediaFiles) {
        if (usedMediaFiles.has(mediaFile.id)) continue;
        
        const similarity = calculateSimilarity(textFile.metadata.name, mediaFile.metadata.name);
        if (similarity > 80) {
          groups.push({
            text: textFile,
            media: [mediaFile],
            similarity
          });
          usedTextFiles.add(textFile.id);
          usedMediaFiles.add(mediaFile.id);
          break;
        }
      }
    }
    
    // Add remaining text files as standalone
    for (const textFile of textFiles) {
      if (!usedTextFiles.has(textFile.id)) {
        groups.push({
          text: textFile,
          media: [],
          similarity: 0
        });
        usedTextFiles.add(textFile.id);
      }
    }
    
    // Add remaining media files as standalone
    for (const mediaFile of mediaFiles) {
      if (!usedMediaFiles.has(mediaFile.id)) {
        groups.push({
          media: [mediaFile],
          similarity: 0
        });
        usedMediaFiles.add(mediaFile.id);
      }
    }
    
    return groups;
  };

  const processFilesForPreview = async (fileList: File[]) => {
    setProcessing(true);
    const previews: FilePreview[] = [];

    for (const file of fileList) {
      const preview = await processFileForPreview(file);
      previews.push(preview);
    }

    // Group files by similarity
    const groupedFiles = groupFilesBySimilarity(previews);
    
    // Convert groups back to flat list with links
    const linkedPreviews: FilePreview[] = [];
    
    for (const group of groupedFiles) {
      if (group.text && group.media.length > 0) {
        // Add text file
        linkedPreviews.push(group.text);
        
        // Add media files linked to text file
        for (const media of group.media) {
          linkedPreviews.push({
            ...media,
            linkedTo: group.text?.id
          });
        }
      } else if (group.text) {
        // Add standalone text file
        linkedPreviews.push(group.text);
      } else if (group.media.length > 0) {
        // Add standalone media files
        linkedPreviews.push(...group.media);
      }
    }

    setFilePreviews(linkedPreviews);
    setStep('preview');
    setProcessing(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    // Simple recursive file reader for folders
    const readEntry = async (entry: FileSystemEntry) => {
        if (entry.isFile) {
            return new Promise<void>((resolve) => {
                (entry as FileSystemFileEntry).file((file) => {
                    files.push(file);
                    resolve();
                });
            });
        } else if (entry.isDirectory) {
            const dirReader = (entry as FileSystemDirectoryEntry).createReader();
            return new Promise<void>((resolve) => {
                dirReader.readEntries(async (entries) => {
                    await Promise.all(entries.map(readEntry));
                    resolve();
                });
            });
        }
    };

    const promises = items.map(item => {
        const entry = (item as any).webkitGetAsEntry();
        if (entry) return readEntry(entry);
        return Promise.resolve();
    });

    await Promise.all(promises);
    processFilesForPreview(files);
  }, []);

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFilesForPreview(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (id: string) => {
    setFilePreviews(prev => prev.filter(file => file.id !== id));
  };

  const handleLinkMedia = (mediaId: string, textId: string | undefined) => {
    setFilePreviews(prev => prev.map(file => 
      file.id === mediaId ? { ...file, linkedTo: textId } : file
    ));
  };

  const handleSaveDocuments = async () => {
    setProcessing(true);
    
    // Create a map to track which text files have been saved with media
    const savedTextFiles = new Set<string>();
    
    // First save media files that are linked to text files
    for (const filePreview of filePreviews) {
      if (filePreview.type === 'media' && filePreview.linkedTo) {
        // Check if linked to a new text file being uploaded
        const linkedTextFile = filePreviews.find(f => f.id === filePreview.linkedTo && f.type === 'text');
        if (linkedTextFile) {
          // Save linked media with text content to database
          const doc: DocRecord = {
            id: uuidv4(),
            title: linkedTextFile.metadata.name,
            content: linkedTextFile.content || '',
            fulltext: linkedTextFile.content || '',
            createdAt: Date.now(),
            tags: [],
            mediaBlob: filePreview.file,
            mediaType: filePreview.metadata.type
          };
          await saveDocument(doc);
          // Mark this text file as saved with media
          savedTextFiles.add(linkedTextFile.id);
        } else {
          // Check if linked to an existing text document from database
          const existingTextDoc = existingTextDocs.find(doc => doc.id === filePreview.linkedTo);
          if (existingTextDoc) {
            // Save media linked to existing text document
            const doc: DocRecord = {
              id: uuidv4(),
              title: existingTextDoc.title,
              content: existingTextDoc.content,
              fulltext: existingTextDoc.fulltext,
              createdAt: Date.now(),
              tags: existingTextDoc.tags,
              mediaBlob: filePreview.file,
              mediaType: filePreview.metadata.type
            };
            await saveDocument(doc);
          }
        }
      }
    }
    
    // Then save standalone text files (not linked with any media)
    for (const filePreview of filePreviews) {
      if (filePreview.type === 'text' && !savedTextFiles.has(filePreview.id)) {
        // Save to database
        const doc: DocRecord = {
          id: uuidv4(),
          title: filePreview.metadata.name,
          content: filePreview.content || '',
          fulltext: filePreview.content || '',
          createdAt: Date.now(),
          tags: []
        };
        await saveDocument(doc);
      }
    }
    
    // Finally save standalone media files (not linked to any text file)
    for (const filePreview of filePreviews) {
      if (filePreview.type === 'media' && !filePreview.linkedTo) {
        // Save to database
        const doc: DocRecord = {
          id: uuidv4(),
          title: filePreview.metadata.name,
          content: "[无文本档案]",
          fulltext: filePreview.metadata.name,
          createdAt: Date.now(),
          tags: [],
          mediaBlob: filePreview.file,
          mediaType: filePreview.metadata.type
        };
        await saveDocument(doc);
      }
    }
    
    // Save unknown type files
    for (const filePreview of filePreviews) {
      if (filePreview.type === 'unknown') {
        // Save to database
        const doc: DocRecord = {
          id: uuidv4(),
          title: filePreview.metadata.name,
          content: `[Unknown file type: ${filePreview.metadata.type}]`,
          fulltext: filePreview.metadata.name,
          createdAt: Date.now(),
          tags: []
        };
        await saveDocument(doc);
      }
    }
    
    setProcessing(false);
    onUploadComplete();
  };

  const renderFilePreview = (preview: FilePreview) => {
    return (
      <div key={preview.id} className="bg-surface rounded-xl border border-slate-700 p-4 mb-4 shadow-lg">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            {getFileIcon(preview.file)}
            <div>
              <h4 className="font-semibold text-white truncate max-w-md">{preview.metadata.name}</h4>
              <div className="flex space-x-4 text-xs text-slate-400">
                <span>{formatFileSize(preview.metadata.size)}</span>
                <span>{preview.metadata.lastModified.toLocaleString()}</span>
                <span>{preview.metadata.type || 'Unknown'}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => handleRemoveFile(preview.id)}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {preview.type === 'text' && (
          <div className="bg-black/20 p-4 rounded-lg mb-3 max-h-40 overflow-auto text-sm text-slate-300 font-mono">
            {preview.content?.substring(0, 500)}
            {preview.content && preview.content.length > 500 && <span className="text-slate-500">...</span>}
          </div>
        )}

        {preview.type === 'media' && (
          <div className="mb-3">
            <div className="bg-black/20 p-4 rounded-lg flex items-center justify-center">
              {getFileIcon(preview.file)}
              <span className="ml-2 text-slate-400">{preview.metadata.name}</span>
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                链接到文本档案（可选）：
              </label>
              <select 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                value={preview.linkedTo || ''}
                onChange={(e) => handleLinkMedia(preview.id, e.target.value || undefined)}
              >
                <option value="">无链接 - 保存为独立档案</option>
                
                {/* Newly uploaded text files */}
                {filePreviews.filter(file => file.type === 'text').length > 0 && (
                  <optgroup label="新上传档案">
                    {filePreviews
                      .filter(file => file.type === 'text')
                      .map(textFile => (
                        <option key={textFile.id} value={textFile.id}>
                          {textFile.metadata.name}
                        </option>
                      ))
                    }
                  </optgroup>
                )}
                
                {/* Existing text files from database */}
                {existingTextDocs.length > 0 && (
                  <optgroup label="数据库中现有档案">
                    {existingTextDocs.map(textDoc => (
                      <option key={textDoc.id} value={textDoc.id}>
                        {textDoc.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (step === 'preview') {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setStep('upload')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h2 className="text-3xl font-bold text-white">查看待上传文件</h2>
        </div>

        <div className="flex-1 overflow-auto">
          {filePreviews.length === 0 ? (
            <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              No files to review. Please upload some files.
            </div>
          ) : (
            <div className="space-y-4">
              {filePreviews.map(renderFilePreview)}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700">
          <button 
            onClick={() => setStep('upload')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            返回
          </button>
          <button 
            onClick={handleSaveDocuments}
            disabled={processing || filePreviews.length === 0}
            className="px-6 py-3 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {processing ? 'Saving...' : 'Save to Database'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold text-white">导入文件</h2>
        <p className="text-slate-400">
          请选择文件夹或拖拽到此处。
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 transition-all duration-300
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-[0.99]' 
            : 'border-slate-600 bg-surface/50 hover:border-slate-500 hover:bg-surface'}
        `}
      >
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-primary' : 'text-slate-400'}`} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">拖拽文件到此处</h3>
        <p className="text-slate-400 mb-8 text-center max-w-md">
          支持文件夹上传。
          <br/>兼容 .txt, .doc, .mp3, .png 等文件格式。
        </p>

        <div className="flex space-x-4">
            <label className="cursor-pointer bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-primary/50 transition-all active:scale-95">
            选择文件
            <input 
                type="file" 
                multiple 
                className="hidden" 
                onChange={handleManualSelect} 
            />
            </label>
            {/* Note: directory selection via input is non-standard but widely supported in Chrome/FF */}
            <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all active:scale-95">
            选择文件夹
            <input 
                type="file" 
                multiple 
                // @ts-ignore
                webkitdirectory=""
                directory="" 
                className="hidden" 
                onChange={handleManualSelect} 
            />
            </label>
        </div>
      </div>

      {processing && (
        <div className="bg-surface rounded-xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
            <span className="text-slate-300">Processing files...</span>
          </div>
        </div>
      )}
    </div>
  );
};