import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { UploadZone } from './components/UploadZone';
import { DocumentViewer } from './components/DocumentViewer';
import { BrowsePage } from './components/BrowsePage';
import { DocRecord, ViewState } from './types';
import { getStats } from './services/db';
import { Search, FileText, PlayCircle, Database } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [previousView, setPreviousView] = useState<ViewState>('BROWSE'); // Default fallback
  const [selectedDoc, setSelectedDoc] = useState<DocRecord | null>(null);
  const [stats, setStats] = useState({ totalDocs: 0, mediaDocs: 0, textOnlyDocs: 0 });

  // Refresh stats when view changes to dashboard
  useEffect(() => {
    if (view === 'DASHBOARD') {
      loadStats();
    }
  }, [view]);

  const loadStats = async () => {
    const s = await getStats();
    setStats(s);
  };

  const handleDocClick = (doc: DocRecord) => {
    // Save current view before switching to viewer
    setPreviousView(view);
    setSelectedDoc(doc);
    setView('VIEWER');
  };

  const handleBackFromViewer = () => {
    setSelectedDoc(null);
    // Return to the previous view instead of always going to SEARCH
    setView(previousView);
  };

  const handleBackFromBrowse = () => {
    setView('DASHBOARD');
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">欢迎回来</h2>
        <p className="text-slate-400">您的知识库已准备就绪。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database size={100} />
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">总文档数</p>
            <p className="text-4xl font-bold text-white">{stats.totalDocs}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <PlayCircle size={100} />
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">媒体文档数</p>
            <p className="text-4xl font-bold text-primary">{stats.mediaDocs}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText size={100} />
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">文本文档数</p>
            <p className="text-4xl font-bold text-emerald-400">{stats.textOnlyDocs}</p>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-semibold text-white">快速操作</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button 
                onClick={() => setView('UPLOAD')}
                className="p-6 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-xl hover:border-primary transition-all group text-left"
            >
                <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-primary rounded-lg text-white group-hover:scale-110 transition-transform">
                        <Database />
                    </div>
                    <span className="font-semibold text-lg text-white">导入新数据</span>
                </div>
                <p className="text-sm text-slate-400">上传文件夹或文件以索引到本地数据库。</p>
             </button>

             <button 
                onClick={() => setView('BROWSE')}
                className="p-6 bg-surface border border-slate-700 rounded-xl hover:border-slate-500 transition-all group text-left"
            >
                <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-slate-700 rounded-lg text-white group-hover:scale-110 transition-transform">
                        <Search />
                    </div>
                    <span className="font-semibold text-lg text-white">浏览和搜索知识库</span>
                </div>
                <p className="text-sm text-slate-400">查看、搜索和管理数据库中的所有记录。</p>
             </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout currentView={view} onNavigate={setView}>
      {view === 'DASHBOARD' && renderDashboard()}
      {view === 'UPLOAD' && <UploadZone onUploadComplete={() => {
        setView('BROWSE');
        // Refresh stats for dashboard view
        loadStats();
      }} />}
      {view === 'VIEWER' && selectedDoc && (
        <DocumentViewer doc={selectedDoc} onBack={handleBackFromViewer} />
      )}
      {view === 'BROWSE' && (
        <BrowsePage 
          onDocClick={handleDocClick} 
          onBack={handleBackFromBrowse} 
        />
      )}
    </Layout>
  );
}