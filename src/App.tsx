import React, { useState, useEffect } from 'react';
import { ProjectArchitect } from './components/ProjectArchitect';
import { KanbanDashboard } from './components/KanbanDashboard';
import { Auth } from './components/Auth';
import { TeamManager } from './components/TeamManager';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { LayoutDashboard, Wand2, LogOut, Users } from 'lucide-react';
import './App.css'; 

function App() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'architect'>('kanban');
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const activeTeamId = useStore(state => state.activeTeamId);
  const setActiveTeamId = useStore(state => state.setActiveTeamId);
  const clearSession = useStore(state => state.clearSession);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSession();
  };

  // 1. Not Logged In
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">MajorHelp</h1>
          <p className="mt-2 text-lg text-gray-600">TrackMind Collaborative AI Academic Project Manager</p>
        </header>
        <Auth />
      </div>
    );
  }

  // 2. Logged In, No Team Selected
  if (!activeTeamId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <header className="flex justify-between items-center max-w-7xl mx-auto mb-8">
          <h1 className="text-2xl font-bold text-gray-900">MajorHelp</h1>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>
        <TeamManager />
      </div>
    );
  }

  // 3. Logged In, Team Selected (Main App)
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">MajorHelp</h1>
            <p className="mt-2 text-lg text-gray-600">TrackMind Collaborative AI Academic Project Manager</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTeamId(null)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md font-medium text-sm transition-colors"
            >
              <Users className="w-4 h-4" />
              Switch Team
            </button>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'kanban' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Kanban Dashboard
          </button>
          <button
            onClick={() => setActiveTab('architect')}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'architect' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <Wand2 className="w-5 h-5" />
            AI Project Architect
          </button>
        </div>

        <main>
          {activeTab === 'kanban' ? <KanbanDashboard /> : <ProjectArchitect />}
        </main>
      </div>
    </div>
  );
}

export default App;
