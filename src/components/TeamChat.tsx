import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Send, MessageSquare, Loader2, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export const TeamChat: React.FC = () => {
  const activeTeamId = useStore(state => state.activeTeamId);
  const user = useStore(state => state.user);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTeamId) return;

    fetchMessages();

    // Subscribe to realtime messages
    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `team_id=eq.${activeTeamId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeamId]);

  useEffect(() => {
    // Auto scroll to bottom
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('team_id', activeTeamId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeTeamId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          team_id: activeTeamId,
          user_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Minimized state
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-all hover:scale-105 z-50 flex items-center justify-center"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  // Maximized state
  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-zinc-100 text-sm">Team Chat</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
            <MessageSquare className="w-8 h-8 opacity-20" />
            <p className="text-xs">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {isMe ? 'You' : msg.user_id.substring(0, 5)}
                  </span>
                </div>
                <div 
                  className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-br-sm' 
                      : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-full focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 placeholder-zinc-600 outline-none transition-all text-sm"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
