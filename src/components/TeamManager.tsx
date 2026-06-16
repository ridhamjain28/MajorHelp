import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Loader2, Users, Plus, ArrowRight } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

export const TeamManager: React.FC = () => {
  const user = useStore(state => state.user);
  const setActiveTeamId = useStore(state => state.setActiveTeamId);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*');
      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ name: newTeamName })
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        setTeams([...teams, data]);
        setNewTeamName('');
        setActiveTeamId(data.id);
      }
    } catch (err) {
      console.error('Failed to create team:', err);
      alert('Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-32">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 glass-panel p-10 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
      
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800/80 mx-auto flex items-center justify-center mb-6 shadow-xl relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl"></div>
          <Users className="w-8 h-8 text-zinc-100 relative z-10" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">Your Workspaces</h2>
        <p className="text-zinc-400 mt-2 text-sm">Select a team to continue, or create a new one.</p>
      </div>

      {teams.length > 0 ? (
        <div className="space-y-3 mb-12">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 ml-1 mb-4">Available Teams</h3>
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setActiveTeamId(team.id)}
              className="w-full flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800 hover:border-indigo-500/40 rounded-xl transition-all duration-300 group"
            >
              <span className="font-medium text-zinc-200 group-hover:text-white">{team.name}</span>
              <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-zinc-900/30 rounded-xl border border-zinc-800/50 mb-12">
          <p className="text-zinc-500 text-sm">You don't belong to any teams yet.</p>
        </div>
      )}

      <form onSubmit={handleCreateTeam} className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800/50">
        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-4">Create New Team</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 placeholder-zinc-600 outline-none transition-all text-sm"
            placeholder="e.g., Capstone Group 4"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 text-sm"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
};
