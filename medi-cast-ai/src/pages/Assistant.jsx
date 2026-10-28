import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Plus, MessageSquare, Loader2, Trash2, Menu, X, Sparkles, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageBubble from '@/components/assistant/MessageBubble';
import { getSavedConversations, saveConversations, createNewChat } from '@/lib/chatStorage';

export default function Assistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const messagesEnd = useRef(null);

  const activeChatId = searchParams.get('c');

  // Load conversations from shared storage
  const refreshConvos = () => {
    const convos = getSavedConversations();
    setConversations(convos);
    setLoadingConvos(false);
  };

  useEffect(() => {
    refreshConvos();
    window.addEventListener('medicast_convos_changed', refreshConvos);
    window.addEventListener('storage', refreshConvos);
    return () => {
      window.removeEventListener('medicast_convos_changed', refreshConvos);
      window.removeEventListener('storage', refreshConvos);
    };
  }, []);

  // Sync active conversation when URL param or conversations list changes
  useEffect(() => {
    if (conversations.length > 0) {
      const targetId = activeChatId || conversations[0].id;
      const target = conversations.find(c => c.id === targetId) || conversations[0];
      setMessages(target.messages || []);
      if (!activeChatId) {
        setSearchParams({ c: target.id }, { replace: true });
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId, conversations]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConvo = conversations.find(c => c.id === activeChatId) || (conversations.length > 0 ? conversations[0] : null);

  const handleCreateNew = () => {
    const newChat = createNewChat();
    refreshConvos();
    setSearchParams({ c: newChat.id });
    setShowMobileDrawer(false);
  };

  const handleDeleteConversation = (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm('Delete this conversation?')) return;
    const updated = conversations.filter(c => c.id !== id);
    saveConversations(updated);
    refreshConvos();
    if (activeChatId === id) {
      if (updated.length > 0) {
        setSearchParams({ c: updated[0].id });
      } else {
        setSearchParams({});
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    let convoId = activeChatId;
    let targetConvo = activeConvo;

    if (!convoId || !targetConvo) {
      targetConvo = {
        id: Date.now().toString(),
        metadata: { name: input.slice(0, 36) + (input.length > 36 ? '…' : ''), description: 'Surgical analysis consultation' },
        messages: []
      };
      convoId = targetConvo.id;
      const updated = [targetConvo, ...conversations];
      saveConversations(updated);
      refreshConvos();
      setSearchParams({ c: convoId });
    }

    const userMsg = { role: 'user', content: input };
    const updatedMessages = [...(targetConvo.messages || []), userMsg];

    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'general',
          message: userMsg.content,
          history: targetConvo.messages || []
        })
      });

      if (!response.ok) throw new Error('Chat request failed');
      const data = await response.json();

      const aiMsg = { role: 'assistant', content: data.response };
      targetConvo.messages = [...updatedMessages, aiMsg];

      // Update title on first response if still default
      if (targetConvo.metadata?.name === 'New Surgical Discussion') {
        targetConvo.metadata.name = userMsg.content.slice(0, 36) + (userMsg.content.length > 36 ? '…' : '');
      }

      const updatedConvos = conversations.map(c => (c.id === targetConvo.id ? targetConvo : c));
      saveConversations(updatedConvos);
      setMessages(targetConvo.messages);
    } catch (e) {
      console.error('Chat error:', e);
      const errorMsg = {
        role: 'assistant',
        content: "I'm temporarily unable to reach the inference provider. Please try again in a moment."
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] md:min-h-screen flex flex-col bg-[#FAF8F5] w-full min-w-0 relative">
      {/* ── Chat Header (Spans directly from the left sidebar) ── */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-stone-200/80 px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate font-heading">
              {activeConvo?.metadata?.name || 'MediCast AI Surgical Assistant'}
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-teal-600" />
              Augmented Vision
            </span>
          </div>
          <p className="text-[11px] text-stone-500 truncate mt-0.5">
            Real-time tissue plane identification, surgical principles & clinical decision support
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleCreateNew}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50 rounded-xl font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-teal-600" />
            <span>New Chat</span>
          </Button>

          {/* Mobile drawer toggle */}
          <Button
            onClick={() => setShowMobileDrawer(true)}
            variant="ghost"
            size="sm"
            className="md:hidden text-stone-500 p-2 rounded-xl"
            title="View recent chats"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Chat Messages Container (Full width, covers all space to left sidebar) ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 w-full max-w-4xl mx-auto space-y-4 min-w-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[55vh]">
            <div className="text-center max-w-md mx-auto p-6 rounded-3xl bg-white/95 border border-stone-200/80 shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto shadow-sm">
                <Compass className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-heading">MediCast Surgical Intelligence</h3>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  Augmented surgical vision & clinical cognitive assistance. Ask about anatomy recognition, connective tissue planes (Calot's, Toldt's, Holy Plane), risk factor assessment, or intraoperative warning systems.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-left">
                {[
                  'What are common risk factors in laparoscopic procedures?',
                  'How does AI recognize connective tissue planes in laparoscopic surgery?',
                  'Explain the Critical View of Safety in laparoscopic cholecystectomy',
                ].map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(promptText); }}
                    className="block w-full text-left text-xs text-stone-700 bg-stone-50/80 hover:bg-teal-50/80 hover:text-teal-800 border border-stone-200/80 hover:border-teal-200 rounded-xl p-3 transition-colors font-medium shadow-2xs"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))
        )}
        <div ref={messagesEnd} />
      </div>

      {/* ── Chat Input Bar (Directly attached to the bottom, full width) ── */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-stone-200/80 p-3 sm:p-4 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto flex gap-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about surgery, connective tissue planes, risk factors, or clinical guidance..."
            className="flex-1 bg-stone-50 border border-stone-200/90 rounded-2xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-2xs"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-2xl px-5 h-auto shadow-xs"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── Mobile Slide-over Drawer for Recent Chats (Only visible when toggled on mobile) ── */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full flex flex-col p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-sm font-bold text-stone-900">Recent Chats</span>
              <button onClick={() => setShowMobileDrawer(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <Button onClick={handleCreateNew} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 rounded-xl">
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {conversations.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSearchParams({ c: c.id });
                    setShowMobileDrawer(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                    activeChatId === c.id ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className="truncate flex-1">{c.metadata?.name || 'Untitled'}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="p-1 text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowMobileDrawer(false)} />
        </div>
      )}
    </div>
  );
}