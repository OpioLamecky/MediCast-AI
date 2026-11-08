import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Plus, MessageSquare, Loader2, Trash2, Menu, X, Sparkles, Compass, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageBubble from '@/components/assistant/MessageBubble';
import { getSavedConversations, saveConversations, createNewChat } from '@/lib/chatStorage';
import { sendChatMessage, generateAutonomousClinicalChat } from '@/api/aiService';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useToast } from '@/components/ui/use-toast';

export default function Assistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { canUseAiAssistant, recordAiQuery, openUpgradeModal, isProOrHigher } = useSubscription();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const messagesEnd = useRef(null);

  const activeChatId = searchParams.get('c');
  const quotaCheck = canUseAiAssistant();

  // Load conversations from storage
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

  // Sync active conversation messages (guarded so it doesn't overwrite while sending)
  useEffect(() => {
    if (sending) return;

    if (conversations.length > 0) {
      const targetId = activeChatId || conversations[0].id;
      const target = conversations.find(c => c.id === targetId) || conversations[0];
      if (target) {
        setMessages(target.messages || []);
        if (!activeChatId) {
          setSearchParams({ c: target.id }, { replace: true });
        }
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId, conversations, sending]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

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

  const sendMessage = async (overrideText) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || sending) return;

    // Check subscription quota
    const quota = canUseAiAssistant();
    if (!quota.allowed) {
      toast({
        title: 'Daily AI Query Quota Reached',
        description: quota.reason,
        variant: 'destructive'
      });
      openUpgradeModal('AI Assistant Daily Quota');
      return;
    }

    setInput('');
    setSending(true);

    // 1. Locate or create active conversation
    let currentConvos = getSavedConversations();
    let currentId = activeChatId;
    let target = currentConvos.find(c => c.id === currentId);

    if (!target) {
      target = {
        id: Date.now().toString(),
        metadata: {
          name: textToSend.slice(0, 32) + (textToSend.length > 32 ? '…' : ''),
          description: 'Surgical analysis consultation'
        },
        messages: []
      };
      currentId = target.id;
      currentConvos = [target, ...currentConvos];
    }

    // 2. Append user message & render immediately
    const userMsg = { role: 'user', content: textToSend };
    const newMessages = [...(target.messages || []), userMsg];
    target.messages = newMessages;

    // Update conversation title on first question
    if (target.metadata?.name === 'New Surgical Discussion' || !target.metadata?.name) {
      target.metadata = {
        ...target.metadata,
        name: textToSend.slice(0, 32) + (textToSend.length > 32 ? '…' : '')
      };
    }

    // Save with user message so storage never wipes out the active thread
    saveConversations(currentConvos);
    setConversations(currentConvos);
    setMessages(newMessages);

    if (activeChatId !== currentId) {
      setSearchParams({ c: currentId }, { replace: true });
    }

    // 3. Request AI reasoning
    try {
      const responseText = await sendChatMessage(textToSend, newMessages);
      const aiMsg = { role: 'assistant', content: responseText };
      const finalMessages = [...newMessages, aiMsg];

      target.messages = finalMessages;
      recordAiQuery();

      saveConversations(currentConvos);
      setConversations([...currentConvos]);
      setMessages(finalMessages);
    } catch (e) {
      console.warn('Inference error in UI, applying autonomous engine:', e);
      const fallbackMsg = {
        role: 'assistant',
        content: generateAutonomousClinicalChat(textToSend, newMessages)
      };
      const finalMessages = [...newMessages, fallbackMsg];
      target.messages = finalMessages;
      saveConversations(currentConvos);
      setConversations([...currentConvos]);
      setMessages(finalMessages);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] md:min-h-screen flex flex-col bg-[#FAF8F5] w-full min-w-0 relative">
      {/* ── Chat Header ── */}
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
          {isProOrHigher ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Crown className="w-3 h-3 text-emerald-600" />
              <span>Pro · Unlimited Queries</span>
            </span>
          ) : (
            <button
              onClick={() => openUpgradeModal('AI Header Upgrade')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <Crown className="w-3 h-3 text-amber-600" />
              <span>{quotaCheck.remaining} Left Today</span>
              <span className="text-teal-700 font-bold underline ml-1">Upgrade</span>
            </button>
          )}

          <Button
            onClick={handleCreateNew}
            variant="outline"
            className="border-stone-200 hover:bg-stone-100 text-stone-700 text-xs gap-1.5 rounded-xl shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>

          <Button
            onClick={() => setShowMobileDrawer(true)}
            variant="ghost"
            size="icon"
            className="md:hidden text-stone-600"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* ── Main Message Thread ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 max-w-4xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="h-full min-h-[380px] flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm text-center space-y-4">
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
                  'What do you understand by the term surgery?',
                  'Explain the Critical View of Safety in laparoscopic cholecystectomy',
                  'How does AI recognize connective tissue planes in laparoscopic surgery?',
                  'What are common risk factors in laparoscopic procedures?'
                ].map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(promptText)}
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

        {/* Pulsing Clinical Reasoning Indicator */}
        {sending && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs max-w-2xl animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-1 py-1">
              <p className="text-xs font-bold text-teal-900">MediCast Clinical Reasoning Engine</p>
              <p className="text-xs text-stone-500">Synthesizing evidence-based surgical analysis...</p>
            </div>
          </div>
        )}

        <div ref={messagesEnd} />
      </div>

      {/* ── Chat Input Bar (Inside Form with e.preventDefault to prevent shaking) ── */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-stone-200/80 p-3 sm:p-4 sticky bottom-0 z-20">
        {!quotaCheck.allowed && !isProOrHigher && (
          <div className="max-w-4xl mx-auto mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <Crown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Daily Free Limit Reached:</strong> You've used all 10 free AI queries today. Upgrade to Pro Surgeon for unlimited surgical reasoning.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openUpgradeModal('AI Assistant Daily Limit')}
              className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shrink-0 transition-colors shadow-xs"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="max-w-4xl mx-auto flex gap-2.5"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about surgery, connective tissue planes, risk factors, or clinical guidance..."
            className="flex-1 bg-stone-50 border border-stone-200/90 rounded-2xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all shadow-2xs"
            disabled={sending}
            autoFocus
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-2xl px-5 h-auto shadow-xs"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      {/* ── Mobile Slide-over Drawer for Recent Chats ── */}
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
