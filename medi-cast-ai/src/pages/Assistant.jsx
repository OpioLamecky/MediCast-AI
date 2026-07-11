import { useState, useEffect, useRef } from 'react';
// removed base44
import { Send, Plus, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageBubble from '@/components/assistant/MessageBubble';

export default function Assistant() {
  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const messagesEnd = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = () => {
    try {
      const stored = localStorage.getItem('medicast_convos');
      const convos = stored ? JSON.parse(stored) : [];
      setConversations(convos);
      if (convos.length > 0) {
        selectConversation(convos[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConvos(false);
    }
  };

  const saveConversations = (convos) => {
    localStorage.setItem('medicast_convos', JSON.stringify(convos));
    setConversations(convos);
  };

  const deleteConversation = (id) => {
    if (!window.confirm("Delete this conversation?")) return;
    const updated = conversations.filter(c => c.id !== id);
    saveConversations(updated);
    if (activeConvoId === id) {
      if (updated.length > 0) {
        selectConversation(updated[0]);
      } else {
        setActiveConvoId(null);
        setMessages([]);
      }
    }
  };

  const selectConversation = (convo) => {
    setActiveConvoId(convo.id);
    setMessages(convo.messages || []);
  };

  const createNewConversation = () => {
    const convo = {
      id: Date.now().toString(),
      metadata: { name: 'New Analysis Discussion', description: 'Surgery analysis conversation' },
      messages: []
    };
    const updated = [convo, ...conversations];
    saveConversations(updated);
    selectConversation(convo);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    let convoId = activeConvoId;
    let activeConvo;

    if (!convoId) {
      activeConvo = {
        id: Date.now().toString(),
        metadata: { name: input.slice(0, 40), description: 'Surgery analysis conversation' },
        messages: []
      };
      convoId = activeConvo.id;
      setActiveConvoId(convoId);
      saveConversations([activeConvo, ...conversations]);
    } else {
      activeConvo = conversations.find(c => c.id === convoId);
    }

    const userMsg = { role: 'user', content: input };
    const updatedMessages = [...(activeConvo.messages || []), userMsg];
    
    // Update local state immediately
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: 'general', 
          message: userMsg.content,
          history: activeConvo.messages || []
        })
      });

      if (!response.ok) throw new Error('Chat failed');
      const data = await response.json();
      
      const aiMsg = { role: 'assistant', content: data.response };
      activeConvo.messages = [...updatedMessages, aiMsg];
      
      const updatedConvos = conversations.map(c => c.id === activeConvo.id ? activeConvo : c);
      saveConversations(updatedConvos);
      setMessages(activeConvo.messages);
    } catch (e) {
      console.error(e);
      // Optional: Add an error message
    } finally {
      setSending(false);
    }
  };

  const activeConvo = conversations.find(c => c.id === activeConvoId);

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col max-md:hidden">
        <div className="p-4 border-b border-slate-100">
          <Button onClick={createNewConversation} variant="outline" className="w-full text-sm gap-2">
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loadingConvos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No conversations yet</p>
          ) : (
            conversations.map(c => (
              <div key={c.id} className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                  c.id === activeConvoId
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <button
                  onClick={() => selectConversation(c)}
                  className="flex-1 text-left truncate"
                >
                  <MessageSquare className="w-3.5 h-3.5 inline mr-2 opacity-50" />
                  {c.metadata?.name || 'Untitled'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-400 transition-all"
                  title="Delete Chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {activeConvo?.metadata?.name || 'MediCast AI Assistant'}
            </h2>
            <p className="text-[11px] text-slate-400">Surgical analysis AI</p>
          </div>
          <div className="md:hidden">
            <Button onClick={createNewConversation} variant="ghost" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 font-heading">MediCast AI</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Ask me about surgical procedures, analysis results, technique assessments, or any clinical questions.
                </p>
                <div className="mt-4 space-y-2">
                  {['Summarize the latest surgery analysis', 'What are common risk factors in laparoscopic procedures?', 'Compare efficiency across recent cases'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="block w-full text-left text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-teal-300 hover:text-teal-600 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about a surgery or analysis..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}