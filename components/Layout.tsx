import React from 'react';
import { LayoutDashboard, UploadCloud, BrainCircuit } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

const NavItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-primary/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-slate-700/50 flex flex-col shadow-2xl z-10">
        <div className="p-6 flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            DocuManager
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="主页" 
            active={currentView === 'DASHBOARD'} 
            onClick={() => onNavigate('DASHBOARD')}
          />
          <NavItem 
            icon={<BrainCircuit size={20} />} 
            label="浏览数据" 
            active={currentView === 'BROWSE' || currentView === 'VIEWER'} 
            onClick={() => onNavigate('BROWSE')}
          />
          <NavItem 
            icon={<UploadCloud size={20} />} 
            label="导入数据" 
            active={currentView === 'UPLOAD'} 
            onClick={() => onNavigate('UPLOAD')}
          />
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="text-xs text-slate-500 text-center">
            v1.0.0 • 本地安全存储
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-slate-900">
        <div className="max-w-7xl mx-auto p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};