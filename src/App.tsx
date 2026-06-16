import { useState, useEffect } from 'react';
import { ProjectArchitect } from './components/ProjectArchitect';
import { KanbanDashboard } from './components/KanbanDashboard';
import { Auth } from './components/Auth';
import { TeamManager } from './components/TeamManager';
import { TeamChat } from './components/TeamChat';
import { DocumentSpace } from './components/DocumentSpace';
import { TeamSettings } from './components/TeamSettings';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { LayoutDashboard, Wand2, LogOut, Users, FileText } from 'lucide-react';
import './App.css'; 

function App() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'architect' | 'documents'>('kanban');
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const activeTeamId = useStore(state => state.activeTeamId);
  const setActiveTeamId = useStore(state => state.setActiveTeamId);
  const clearSession = useStore(state => state.clearSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSession();
  };

  // Ambient glowing orbs background (UtilityOS style)
  const renderAmbientBackground = () => (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none -z-20"></div>
      <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[130px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '12s' }}></div>
    </>
  );

  // 1. Not Logged In
  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {renderAmbientBackground()}
        <header className="mb-12 text-center relative z-10 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-zinc-100">
            MajorHelp
          </h1>
          <p className="mt-4 text-base md:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            TrackMind Collaborative AI Academic Project Manager
          </p>
        </header>
        <div className="relative z-10 w-full">
          <Auth />
        </div>
      </div>
    );
  }

  // 2. Logged In, No Team Selected
  if (!activeTeamId) {
    return (
      <div className="relative min-h-screen overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
        {renderAmbientBackground()}
        <header className="relative z-10 flex justify-between items-center max-w-7xl mx-auto mb-16 pt-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">MajorHelp</h1>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>
        <div className="relative z-10">
          <TeamManager />
        </div>
      </div>
    );
  }

  // 3. Logged In, Team Selected (Main App)
  return (
    <div className="relative min-h-screen overflow-hidden py-10 px-4 sm:px-6 lg:px-8">
      {renderAmbientBackground()}
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">MajorHelp</h1>
            <p className="mt-1 text-sm text-zinc-400">TrackMind Collaborative AI Academic Project Manager</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTeamId(null)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg font-medium text-sm transition-all"
            >
              <Users className="w-4 h-4" />
              Switch Team
            </button>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium text-sm transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 mb-10 bg-zinc-900/50 border border-zinc-800/60 rounded-xl w-fit backdrop-blur-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 py-2 px-5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'kanban' ? 'bg-zinc-800 shadow-sm text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 py-2 px-5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'documents' ? 'bg-zinc-800 shadow-sm text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          >
            <FileText className="w-4 h-4" />
            Context Space
          </button>
          <button
            onClick={() => setActiveTab('architect')}
            className={`flex items-center gap-2 py-2 px-5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'architect' ? 'bg-zinc-800 shadow-sm text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          >
            <Wand2 className="w-4 h-4" />
            AI Architect
          </button>
        </div>

        <main>
          {activeTab === 'kanban' && <KanbanDashboard />}
          {activeTab === 'documents' && <DocumentSpace />}
          {activeTab === 'architect' && <ProjectArchitect />}
        </main>
        
        {/* Floating Widgets */}
        <TeamChat />
        <TeamSettings />
      </div>
    </div>
  );
}

export default App;
