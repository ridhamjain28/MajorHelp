import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Settings, X, Check, Shield, Users, LogOut } from 'lucide-react';

export const TeamSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'project'>('project');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const activeTeamId = useStore(state => state.activeTeamId);
  const user = useStore(state => state.user);
  const clearSession = useStore(state => state.clearSession);

  useEffect(() => {
    if (isOpen && activeTeamId) {
      fetchPendingRequests();
    }
  }, [isOpen, activeTeamId]);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('team_join_requests')
        .select('*, teams(name)')
        .eq('team_id', activeTeamId)
        .eq('status', 'pending');
      if (error) throw error;
      setPendingRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    }
  };

  const handleApprove = async (request: any, approve: boolean) => {
    try {
      if (approve) {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({ team_id: request.team_id, user_id: request.user_id, role: 'editor' });
        if (memberError) throw memberError;
      }
      
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSession();
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 p-4 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full shadow-lg border border-zinc-800/80 backdrop-blur-md transition-all hover:scale-105 z-40 flex items-center justify-center group"
      >
        <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform duration-300" />
        {pendingRequests.length > 0 && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-zinc-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Settings
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-48 border-r border-zinc-800 p-4 space-y-2 bg-zinc-950/50">
                <button
                  onClick={() => setActiveTab('project')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'project' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                >
                  <Shield className="w-4 h-4" /> Project
                </button>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                >
                  <Users className="w-4 h-4" /> Account
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'project' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                        Pending Approvals
                        {pendingRequests.length > 0 && (
                          <span className="bg-indigo-500/20 text-indigo-400 text-xs py-0.5 px-2 rounded-full font-mono">{pendingRequests.length}</span>
                        )}
                      </h3>
                      
                      {pendingRequests.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl">
                          <p className="text-sm text-zinc-500">No pending requests for this team.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pendingRequests.map(req => (
                            <div key={req.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-zinc-200">User ID: <span className="font-mono text-xs font-normal text-zinc-400">{req.user_id.substring(0, 8)}...</span></p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleApprove(req, true)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors" title="Approve">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleApprove(req, false)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Reject">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100 mb-2">My Account</h3>
                      <p className="text-zinc-400 text-sm mb-6">Manage your session and profile.</p>
                      
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <p className="text-sm text-zinc-400 mb-1">Signed in as:</p>
                        <p className="font-medium text-zinc-200 mb-4">{user?.email}</p>
                        
                        <button 
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium text-sm transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
