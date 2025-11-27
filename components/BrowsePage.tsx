import React, { useState, useEffect } from 'react';
import { DocRecord } from '../types';
import { getAllDocuments, deleteDocument } from '../services/db';
import { FileText, PlayCircle, Trash2, Search, Database } from 'lucide-react';

interface BrowsePageProps {
  onDocClick: (doc: DocRecord) => void;
  onBack: () => void;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({ onDocClick, onBack }) => {
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'text' | 'media'>('all');
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  // Load all documents from database
  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      try {
        const docs = await getAllDocuments();
        setDocuments(docs.reverse()); // Show newest first
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...documents];

    // Apply filter
    if (filter === 'text') {
      result = result.filter(doc => !doc.mediaBlob);
    } else if (filter === 'media') {
      result = result.filter(doc => !!doc.mediaBlob);
    }

    // Apply search
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(doc => 
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery) ||
        doc.fulltext.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredDocs(result);
  }, [documents, filter, searchQuery]);

  // Handle document deletion
  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(docId);
      // Update documents list
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      setShowConfirmDelete(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-700 transition-colors"
          >
            <Database className="text-slate-300" size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white">浏览数据库</h2>
        </div>
        <div className="text-sm text-slate-400">
          共 {documents.length} 条记录
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索记录..."
            className="w-full bg-surface border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-lg transition-all"
          />
        </div>

        {/* Filter Options */}
        <div className="flex items-center space-x-2 bg-surface border border-slate-700 rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'text' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            文本
          </button>
          <button
            onClick={() => setFilter('media')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'media' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            媒体
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="text-center py-20 text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            加载中...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            未找到匹配的记录。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredDocs.map(doc => (
              <div 
                key={doc.id}
                className="bg-surface p-4 rounded-xl border border-slate-700 flex items-start space-x-4 group"
              >
                {/* Document Icon */}
                <div 
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${doc.mediaBlob ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-400'}`}
                  onClick={() => onDocClick(doc)}
                >
                  {doc.mediaBlob ? <PlayCircle size={24} /> : <FileText size={24} />}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onDocClick(doc)}>
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-white truncate pr-4 group-hover:text-primary transition-colors">
                      {doc.title}
                    </h4>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                    {doc.content.slice(0, 200)}{doc.content.length > 200 ? '...' : ''}
                  </p>
                  {doc.mediaBlob && (
                    <div className="mt-2 inline-flex items-center text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                      <PlayCircle size={12} className="mr-1" />
                      包含媒体
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmDelete(doc.id);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-all"
                  title="删除记录"
                >
                  <Trash2 size={18} />
                </button>

                {/* Confirm Delete Dialog */}
                {showConfirmDelete === doc.id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-2xl p-6 border border-slate-700 shadow-2xl max-w-md w-full">
                      <h3 className="text-xl font-bold text-white mb-3">确认删除</h3>
                      <p className="text-slate-400 mb-6">
                        确定要删除文档 "{doc.title}" 吗？此操作不可恢复。
                      </p>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setShowConfirmDelete(null)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                        >
                          确认删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
