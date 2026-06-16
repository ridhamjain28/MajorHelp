import React, { useState } from 'react';
import { generateProjectProposals, type ProjectProposal } from '../lib/llm';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ProjectArchitect: React.FC = () => {
  const activeTeamId = useStore(state => state.activeTeamId);
  const [phase, setPhase] = useState('Senior / Capstone');
  const [domain, setDomain] = useState('Full-stack SaaS with AI');
  const [constraints, setConstraints] = useState('No paid APIs, must use React');
  const [apiKey, setApiKey] = useState(localStorage.getItem('OPENAI_API_KEY') || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setError("Please provide an OpenAI API Key.");
      return;
    }
    
    localStorage.setItem('OPENAI_API_KEY', apiKey);
    setLoading(true);
    setError(null);
    setProposals([]);
    setSelectedIdx(null);

    try {
      // Fetch document context
      const { data: docs } = await supabase
        .from('documents')
        .select('title, content')
        .eq('team_id', activeTeamId);
        
      const context = docs && docs.length > 0 
        ? docs.map(d => `Document: ${d.title}\n${d.content}`).join('\n\n') 
        : '';

      const generated = await generateProjectProposals(apiKey, phase, domain, constraints, context);
      setProposals(generated);
    } catch (err: any) {
      setError(err.message || 'Failed to generate proposals.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = async (idx: number) => {
    setSelectedIdx(idx);
    const selected = proposals[idx];
    
    if (!activeTeamId) {
      alert("No active team workspace selected!");
      return;
    }

    setSaving(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          team_id: activeTeamId,
          name: selected.title,
          description: selected.description
        })
        .select()
        .single();

      if (projectError) throw projectError;

      if (projectData && selected.milestones.length > 0) {
        const tasksToInsert = selected.milestones.map(m => ({
          project_id: projectData.id,
          title: m,
          description: '',
          status: 'todo'
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      alert("Project and milestones successfully synced to your Workspace!");
    } catch (err) {
      console.error(err);
      alert("Failed to save project to Supabase.");
    } finally {
      setSaving(false);
    }
  };

  if (!activeTeamId) {
    return null;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-panel p-8 md:p-10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-indigo-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-zinc-100 mb-2 flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          Project Architect Wizard
        </h2>
        <p className="text-zinc-400 mb-8 max-w-2xl text-sm leading-relaxed">
          Describe your academic level and interests. Our LLM will generate 3 comprehensive, semester-long project proposals with structured milestones ready for your Kanban board.
        </p>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Academic Phase</label>
            <input 
              type="text" 
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 outline-none transition-all text-sm"
              placeholder="e.g. Junior Year, Masters Thesis"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Domain Interest</label>
            <input 
              type="text" 
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 outline-none transition-all text-sm"
              placeholder="e.g. IoT, Machine Learning, Web3"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Hardware/Software Constraints</label>
            <input 
              type="text" 
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 outline-none transition-all text-sm"
              placeholder="e.g. Raspberry Pi only, No paid APIs"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2 pt-4 border-t border-zinc-800">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">OpenAI API Key (BYOK)</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-zinc-100 outline-none transition-all text-sm font-mono"
              placeholder="sk-..."
              required
            />
            <p className="text-xs text-zinc-500 mt-1">Your key is never sent to our servers. It is stored locally in your browser.</p>
          </div>

          <div className="md:col-span-2 mt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto px-8 py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Architecting...' : 'Generate Proposals'}
            </button>
          </div>
        </form>
      </div>

      {proposals.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            Generated Proposals
            <span className="bg-indigo-500/20 text-indigo-400 text-xs py-0.5 px-2 rounded-full font-mono">3</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {proposals.map((prop, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden group ${selectedIdx === idx ? 'bg-indigo-500/5 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700 backdrop-blur-sm'}`}
                onClick={() => handleSelectProposal(idx)}
              >
                {selectedIdx === idx && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-zinc-100 text-lg leading-tight group-hover:text-indigo-300 transition-colors">{prop.title}</h4>
                  {selectedIdx === idx && <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />}
                </div>
                
                <p className="text-sm text-zinc-400 mb-6 flex-1 leading-relaxed">{prop.description}</p>
                
                <div className="space-y-3">
                  <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Milestones</h5>
                  <ul className="space-y-2">
                    {prop.milestones.map((m, mIdx) => (
                      <li key={mIdx} className="text-xs text-zinc-300 flex items-start gap-2">
                        <span className="text-indigo-500/50 font-bold mt-0.5">•</span>
                        <span className="leading-snug">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button 
                  className={`mt-6 w-full py-2.5 rounded-lg font-bold text-xs transition-all ${selectedIdx === idx ? 'bg-indigo-500 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'}`}
                >
                  {saving && selectedIdx === idx ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...</span>
                  ) : selectedIdx === idx ? (
                    'Selected'
                  ) : (
                    'Select Project'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
