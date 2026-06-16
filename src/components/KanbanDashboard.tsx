import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { expandTask } from '../lib/llm';
import { Sparkles, CheckCircle, Circle, PlayCircle, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
}

export const KanbanDashboard: React.FC = () => {
  const activeTeamId = useStore(state => state.activeTeamId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandingTaskId, setExpandingTaskId] = useState<string | null>(null);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');

  useEffect(() => {
    if (activeTeamId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [activeTeamId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('team_id', activeTeamId);
      
      if (projError) throw projError;
      setProjects(projData || []);

      if (projData && projData.length > 0) {
        setNewTaskProjectId(projData[0].id); // default selection
        const projectIds = projData.map(p => p.id);
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds);
        
        if (taskError) throw taskError;
        setTasks(taskData || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProjectId) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: newTaskProjectId,
          title: newTaskTitle,
          description: newTaskDescription,
          status: 'todo'
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks([...tasks, data]);
      }
      setIsNewTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Failed to create task');
    }
  };

  const handleAIExpand = async (task: Task) => {
    const apiKey = localStorage.getItem('OPENAI_API_KEY');
    if (!apiKey) {
      alert("Please provide an OpenAI API Key in the Project Architect wizard first.");
      return;
    }

    setExpandingTaskId(task.id);
    try {
      const generatedChecklist = await expandTask(apiKey, task.title, task.description || "");
      const newDescription = `${task.description || ''}\n\n**AI Implementation Plan:**\n${generatedChecklist}`.trim();
      
      setTasks(tasks.map(t => t.id === task.id ? { ...t, description: newDescription } : t));
      
      await supabase.from('tasks').update({ description: newDescription }).eq('id', task.id);
    } catch (err) {
      console.error(err);
      alert("Failed to expand task with AI");
    } finally {
      setExpandingTaskId(null);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const renderColumn = (status: Task['status'], title: string, icon: React.ReactNode, iconColor: string) => {
    const colTasks = tasks.filter(t => t.status === status);
    
    return (
      <div className="flex flex-col bg-zinc-900/40 rounded-2xl border border-zinc-800/60 overflow-hidden backdrop-blur-sm h-full">
        <div className={`flex items-center justify-between p-5 border-b border-zinc-800/60 bg-zinc-900/80`}>
          <div className="flex items-center gap-3">
            <div className={iconColor}>{icon}</div>
            <h3 className="font-bold text-zinc-200 tracking-tight">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {status === 'todo' && projects.length > 0 && (
              <button 
                onClick={() => setIsNewTaskModalOpen(true)}
                className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded-md transition-colors font-bold"
              >
                + Add
              </button>
            )}
            <span className="bg-zinc-800 text-zinc-400 text-xs py-1 px-2.5 rounded-full font-mono font-medium">
              {colTasks.length}
            </span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {colTasks.map(task => (
            <div key={task.id} className="bg-zinc-950/80 p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-700 hover:-translate-y-0.5 transition-all duration-300 shadow-sm group">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2">
                {projects.find(p => p.id === task.project_id)?.name}
              </div>
              <h4 className="font-semibold text-zinc-100 mb-2 leading-snug">{task.title}</h4>
              {task.description && (
                <div className="text-xs text-zinc-400 mb-4 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                  {task.description}
                </div>
              )}
              
              <div className="flex flex-col gap-3 mt-5 pt-4 border-t border-zinc-800/60">
                <select 
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                  className="text-xs border border-zinc-800 rounded-lg p-2 bg-zinc-900 text-zinc-300 outline-none w-full hover:border-zinc-700 transition-colors cursor-pointer appearance-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                
                <button
                  onClick={() => handleAIExpand(task)}
                  disabled={expandingTaskId === task.id}
                  className="relative overflow-hidden flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/20 transition-all disabled:opacity-50 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                >
                  {expandingTaskId === task.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {expandingTaskId === task.id ? 'Expanding...' : 'AI Expand'}
                </button>
              </div>
            </div>
          ))}
          {colTasks.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-sm italic">
              No tasks here
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!activeTeamId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Passive Timeline Tracker */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Semester Progress</h2>
            <p className="text-sm text-zinc-400 mt-1">Based on task completion across all projects</p>
          </div>
          <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            {progressPercent}%
          </div>
        </div>
        <div className="w-full bg-zinc-900 rounded-full h-3 border border-zinc-800 overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[750px]">
        {renderColumn('todo', 'To Do', <Circle className="w-5 h-5" />, 'text-zinc-500')}
        {renderColumn('in_progress', 'In Progress', <PlayCircle className="w-5 h-5" />, 'text-indigo-500')}
        {renderColumn('done', 'Done', <CheckCircle className="w-5 h-5" />, 'text-emerald-500')}
      </div>

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h3 className="text-xl font-bold text-zinc-100 mb-6">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Project</label>
                <select 
                  value={newTaskProjectId}
                  onChange={(e) => setNewTaskProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 outline-none text-sm"
                  required
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Task Title</label>
                <input 
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 outline-none text-sm focus:border-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 outline-none text-sm min-h-[100px] focus:border-indigo-500/50"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
