import React, { useState } from 'react';
import { ProjectArchitect } from './components/ProjectArchitect';
import { KanbanDashboard } from './components/KanbanDashboard';
import { useStore } from './store/useStore';
import { LayoutDashboard, Wand2 } from 'lucide-react';
import './App.css'; 

function App() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'architect'>('kanban');
  const activeTeamId = useStore(state => state.activeTeamId);
  const setActiveTeamId = useStore(state => state.setActiveTeamId);

  // Temporary mock active team selector since we haven't built the Auth/Team creation flow yet
  // This helps us test the UI locally.
  const handleMockTeam = () => {
    setActiveTeamId('11111111-1111-1111-1111-111111111111');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">MajorHelp</h1>
            <p className="mt-2 text-lg text-gray-600">TrackMind Collaborative AI Academic Project Manager</p>
          </div>
          
          {!activeTeamId && (
            <button 
              onClick={handleMockTeam}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium text-sm transition-colors"
            >
              Set Mock Active Team (For Testing)
            </button>
          )}
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
