import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Loader2, FileText, UploadCloud, Plus, File, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker via CDN to avoid Vite bundler issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Document {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export const DocumentSpace: React.FC = () => {
  const activeTeamId = useStore(state => state.activeTeamId);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [addingText, setAddingText] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTeamId) {
      fetchDocuments();
    }
  }, [activeTeamId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('team_id', activeTeamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTeamId) return;

    setUploading(true);
    try {
      let extractedContent = '';
      
      if (file.type === 'application/pdf') {
        extractedContent = await extractTextFromPDF(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        extractedContent = await file.text();
      } else {
        throw new Error('Unsupported file type. Please upload PDF or Text files.');
      }

      if (!extractedContent.trim()) {
        throw new Error('Could not extract any text from this file.');
      }

      const { error } = await supabase
        .from('documents')
        .insert({
          team_id: activeTeamId,
          title: file.name,
          content: extractedContent
        });

      if (error) throw error;
      
      // Refresh list
      fetchDocuments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err.message || 'Failed to process document');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTextNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !activeTeamId) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          team_id: activeTeamId,
          title: newTitle.trim(),
          content: newContent.trim()
        });

      if (error) throw error;
      
      setAddingText(false);
      setNewTitle('');
      setNewContent('');
      fetchDocuments();
    } catch (err: any) {
      console.error('Failed to add note:', err);
      alert('Failed to add text note');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2 tracking-tight">
            <FileText className="w-6 h-6 text-indigo-400" />
            Document Context Space
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Upload PDFs or notes here. The AI Architect will automatically read them to understand your project better.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setAddingText(!addingText)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Note
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Upload PDF
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".pdf,.txt,.md" 
            className="hidden" 
          />
        </div>
      </div>

      {addingText && (
        <form onSubmit={handleAddTextNote} className="glass-panel p-6 rounded-xl border border-indigo-500/20 mb-8 animate-fade-in">
          <div className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Note Title (e.g., API Constraints, Grading Rubric)"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 outline-none text-sm"
              required
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Paste raw text, code snippets, or requirements here..."
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-zinc-100 outline-none text-sm min-h-[150px] resize-y"
              required
            />
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setAddingText(false)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={uploading}
                className="px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Note
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border-dashed border-2 border-zinc-800/50">
          <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-300">No Documents Yet</h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-sm mx-auto">
            Upload PDFs or add text notes to provide background context for your AI Architect.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => (
            <div key={doc.id} className="glass-panel p-5 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <File className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h4 className="font-bold text-zinc-100 truncate pr-2" title={doc.title}>{doc.title}</h4>
                </div>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-auto pt-4 border-t border-zinc-800/50">
                {new Date(doc.created_at).toLocaleDateString()} • {Math.round(doc.content.length / 1024)} KB
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
