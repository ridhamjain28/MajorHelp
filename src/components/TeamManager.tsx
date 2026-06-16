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
        // Automatically select the newly created team
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
      <div className="flex justify-center mt-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-10">
        <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900">Your Workspaces</h2>
        <p className="text-gray-500 mt-2">Select a team to continue, or create a new one.</p>
      </div>

      {teams.length > 0 ? (
        <div className="space-y-4 mb-10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Available Teams</h3>
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setActiveTeamId(team.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all group"
            >
              <span className="font-semibold text-gray-800 group-hover:text-blue-700">{team.name}</span>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200 mb-10">
          <p className="text-gray-600">You don't belong to any teams yet.</p>
        </div>
      )}

      <form onSubmit={handleCreateTeam} className="bg-blue-50/50 p-6 rounded-lg border border-blue-100">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-4">Create New Team</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="flex-1 px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Capstone Group 4"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
};
