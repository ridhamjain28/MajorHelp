import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Loader2, Users, Plus, ArrowRight, UserPlus, Check, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  join_code: string;
}

export const TeamManager: React.FC = () => {
  const user = useStore(state => state.user);
  const setActiveTeamId = useStore(state => state.setActiveTeamId);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchTeams();
      fetchPendingRequests();
    }
  }, [user]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('team_join_requests')
        .select('*, teams(name)')
        .eq('status', 'pending');
      if (error) throw error;
      setPendingRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    setCreating(true);
    try {
      const newTeamId = crypto.randomUUID();
      const code = crypto.randomUUID().split('-')[0].toUpperCase();
      
      const { error } = await supabase
        .from('teams')
        .insert({ id: newTeamId, name: newTeamName, join_code: code });
        
      if (error) throw error;
      
      const newTeam = { id: newTeamId, name: newTeamName, join_code: code };
      setTeams([...teams, newTeam]);
      setNewTeamName('');
      setActiveTeamId(newTeam.id);
    } catch (err: any) {
      console.error('Failed to create team:', err);
      alert('Failed to create team. Error: ' + (err?.message || JSON.stringify(err)));
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setJoining(true);
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('join_code', joinCode.toUpperCase())
        .single();
        
      if (teamError || !teamData) throw new Error('Invalid Join Code');
      
      const { error: joinError } = await supabase
        .from('team_join_requests')
        .insert({ 
          team_id: teamData.id, 
          user_id: user?.id,
          status: 'pending'
        });
        
      if (joinError) throw joinError;
      
      alert('Join request sent! Waiting for team owner approval.');
      setJoinCode('');
    } catch (err: any) {
      console.error('Failed to join:', err);
      alert(err.message || 'Failed to request join');
    } finally {
      setJoining(false);
    }
  };

  const handleApprove = async (request: any, approve: boolean) => {
    try {
      if (approve) {
        // Insert into team_members first
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({ team_id: request.team_id, user_id: request.user_id, role: 'editor' });
        if (memberError) throw memberError;
      }
      
      // Update request status
      const { error: updateError } = await supabase
        .from('team_join_requests')
        .update({ status: approve ? 'approved' : 'rejected' })
        .eq('id', request.id);
      if (updateError) throw updateError;
      
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      alert(`Request ${approve ? 'approved' : 'rejected'}!`);
    } catch (err: any) {
      console.error('Failed to process request:', err);
      alert('Failed to process request');
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
    <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column: Teams & Joining */}
      <div className="glass-panel p-10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
        
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800/80 mx-auto flex items-center justify-center mb-6 shadow-xl relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl"></div>
            <Users className="w-8 h-8 text-zinc-100 relative z-10" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">Your Workspaces</h2>
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
                <div className="flex flex-col items-start">
                  <span className="font-medium text-zinc-200 group-hover:text-white">{team.name}</span>
                  <span className="text-xs text-zinc-500 font-mono mt-1">Code: {team.join_code || 'N/A'}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-zinc-900/30 rounded-xl border border-zinc-800/50 mb-12">
            <p className="text-zinc-500 text-sm">You don't belong to any teams yet.</p>
          </div>
        )}

        <div className="space-y-4">
          <form onSubmit={handleCreateTeam} className="bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/50">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-4">Create New Team</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 placeholder-zinc-600 outline-none transition-all text-sm"
                placeholder="Team Name"
                required
              />
              <button disabled={creating} className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70 text-sm">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </div>
          </form>

          <form onSubmit={handleJoinTeam} className="bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/50">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 mb-4">Join Existing Team</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-zinc-100 placeholder-zinc-600 outline-none transition-all text-sm font-mono uppercase"
                placeholder="6-CHAR CODE"
                maxLength={8}
                required
              />
              <button disabled={joining} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70 text-sm border border-zinc-700">
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Join
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Pending Approvals */}
      <div className="glass-panel p-10 rounded-2xl h-fit">
        <h3 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
          Pending Approvals
          {pendingRequests.length > 0 && (
            <span className="bg-indigo-500/20 text-indigo-400 text-xs py-0.5 px-2 rounded-full font-mono">{pendingRequests.length}</span>
          )}
        </h3>
        
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No pending requests for your teams.</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-200">User ID: <span className="font-mono text-xs font-normal text-zinc-400">{req.user_id.substring(0, 8)}...</span></p>
                  <p className="text-xs text-zinc-500 mt-1">Wants to join: <span className="text-indigo-400 font-semibold">{req.teams?.name}</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(req, true)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleApprove(req, false)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
