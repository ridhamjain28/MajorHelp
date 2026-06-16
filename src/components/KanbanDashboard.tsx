import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { expandTask } from '../lib/llm';
import { Sparkles, Clock, CheckCircle, Circle, PlayCircle, Loader2 } from 'lucide-react';

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
      // Fetch projects for team
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('team_id', activeTeamId);
      
      if (projError) throw projError;
      setProjects(projData || []);

      // If we have projects, fetch their tasks
      if (projData && projData.length > 0) {
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
    // Optimistic update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    // DB update
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
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
      const newDescription = \`\${task.description || ''}\n\n**AI Implementation Plan:**\n\${generatedChecklist}\`.trim();
      
      // Update local state
      setTasks(tasks.map(t => t.id === task.id ? { ...t, description: newDescription } : t));
      
      // Update DB
      await supabase
        .from('tasks')
        .update({ description: newDescription })
        .eq('id', task.id);
    } catch (err) {
      console.error(err);
      alert("Failed to expand task with AI");
    } finally {
      setExpandingTaskId(null);
    }
  };

  // Passive Timeline Tracker calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const renderColumn = (status: Task['status'], title: string, icon: React.ReactNode, bgColor: string) => {
    const colTasks = tasks.filter(t => t.status === status);
    
    return (
      <div className={\`flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-full\`}>
        <div className={\`flex items-center gap-2 p-4 border-b border-gray-100 \${bgColor}\`}>
          {icon}
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="ml-auto bg-white/60 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">
            {colTasks.length}
          </span>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-gray-50/50">
          {colTasks.map(task => (
            <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-xs text-blue-600 font-semibold mb-1">
                {projects.find(p => p.id === task.project_id)?.name}
              </div>
              <h4 className="font-bold text-gray-900 mb-2">{task.title}</h4>
              {task.description && (
                <div className="text-sm text-gray-600 mb-4 whitespace-pre-wrap line-clamp-4">
                  {task.description}
                </div>
              )}
              
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <select 
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                    className="text-xs border border-gray-200 rounded-md p-1.5 bg-gray-50 outline-none flex-1"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                
                <button
                  onClick={() => handleAIExpand(task)}
                  disabled={expandingTaskId === task.id}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-md border border-purple-200 transition-colors disabled:opacity-50"
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
            <div className="text-center py-8 text-gray-400 text-sm italic">
              No tasks here
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!activeTeamId) {
    return (
      <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Active Team Workspace</h2>
        <p className="text-gray-500">Please select or create a team to view your Kanban dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Passive Timeline Tracker */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Semester Progress Tracker</h2>
            <p className="text-sm text-gray-500">Based on task completion across all projects</p>
          </div>
          <div className="text-2xl font-bold text-blue-600">{progressPercent}%</div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-1000 ease-out"
            style={{ width: \`\${progressPercent}%\` }}
          ></div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[800px]">
        {renderColumn('todo', 'To Do', <Circle className="w-5 h-5 text-gray-500" />, 'bg-gray-50')}
        {renderColumn('in_progress', 'In Progress', <PlayCircle className="w-5 h-5 text-blue-500" />, 'bg-blue-50')}
        {renderColumn('done', 'Done', <CheckCircle className="w-5 h-5 text-green-500" />, 'bg-green-50')}
      </div>
    </div>
  );
};
