import React, { useState } from 'react';
import { generateProjectProposals, ProjectProposal } from '../lib/llm';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ProjectArchitect: React.FC = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('OPENAI_API_KEY') || '');
  const [phase, setPhase] = useState('');
  const [domain, setDomain] = useState('');
  const [constraints, setConstraints] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  
  const activeTeamId = useStore(state => state.activeTeamId);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setError('Please provide an OpenAI API Key.');
      return;
    }
    localStorage.setItem('OPENAI_API_KEY', apiKey);
    setError(null);
    setLoading(true);
    setProposals([]);
    setSelectedIdx(null);
    
    try {
      const results = await generateProjectProposals(apiKey, phase, domain, constraints);
      setProposals(results);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = async (index: number) => {
    setSelectedIdx(index);
    const proposal = proposals[index];
    
    if (!activeTeamId) {
      alert("No active team selected! In a full app, you must select a team first.");
      return;
    }

    try {
      // 1. Create Project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          team_id: activeTeamId,
          name: proposal.title,
          description: proposal.description,
          domain: domain
        })
        .select('id')
        .single();

      if (projectError) throw projectError;
      
      // 2. Insert Tasks (Milestones)
      if (projectData?.id) {
        const tasks = proposal.milestones.map(m => ({
          project_id: projectData.id,
          title: m,
          description: 'AI Generated Milestone',
          status: 'todo'
        }));
        
        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasks);
          
        if (tasksError) throw tasksError;
      }
      
      alert('Project and milestones successfully populated to your Kanban board!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to save project to Supabase: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2 mb-2">
          <Sparkles className="text-blue-500" />
          Project Architect Wizard
        </h2>
        <p className="text-gray-500">Let AI design your perfect academic project.</p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key (BYOK)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="sk-..."
            required
          />
          <p className="text-xs text-gray-500 mt-2">Stored securely in your local browser storage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Phase</label>
            <input
              type="text"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Minor Project 1, Final Year Capstone"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain Interest</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., IoT, Machine Learning, Web3"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hardware / Software Constraints</label>
          <textarea
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none h-24"
            placeholder="e.g., Must use Raspberry Pi, Python only, Budget under $50"
            required
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'Architecting Projects...' : 'Generate Project Proposals'}
        </button>
      </form>

      {proposals.length > 0 && (
        <div className="mt-12 space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Generated Proposals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {proposals.map((prop, idx) => (
              <div 
                key={idx} 
                className={\`flex flex-col p-6 rounded-xl border-2 transition-all cursor-pointer \${selectedIdx === idx ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white'}\`}
                onClick={() => handleSelectProposal(idx)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-bold text-gray-900 leading-tight">{prop.title}</h4>
                  {selectedIdx === idx && <CheckCircle2 className="text-blue-500 w-6 h-6 flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-600 mb-6 flex-grow">{prop.description}</p>
                
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Key Milestones</h5>
                  <ul className="space-y-2">
                    {prop.milestones.slice(0, 3).map((m, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {m}
                      </li>
                    ))}
                    {prop.milestones.length > 3 && (
                      <li className="text-xs text-gray-500 italic ml-4">
                        + {prop.milestones.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
                
                <button 
                  className={\`mt-6 w-full py-2 rounded-md font-medium text-sm transition-colors \${selectedIdx === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}\`}
                >
                  {selectedIdx === idx ? 'Selected' : 'Select Project'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
