import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Clipboard,
  Copy,
  History,
  Layers3,
  Menu,
  MessageSquareText,
  PanelRight,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NextAuraAIIcon } from '../../components/common/NextAuraAIIcon';
import { nextAuraAIService, NextAuraAIError, type AIResponseAction, type AIResponseSource } from '../../services/nextAuraAIService';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: AIResponseSource[];
  actions?: AIResponseAction[];
  provider?: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: ConversationMessage[];
}

const suggestions = [
  { label: 'Review my finances', prompt: "What's happening with our invoices and expenses?", icon: ReceiptText },
  { label: 'Give me a people update', prompt: "What's happening with my team today?", icon: Users },
  { label: 'What needs attention?', prompt: 'What should I focus on today?', icon: Clipboard },
  { label: 'Teach me a feature', prompt: 'Explain how NextAura Payroll works.', icon: BookOpen },
];

const createConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: 'New conversation',
  createdAt: new Date().toISOString(),
  messages: [],
});

const storageKey = (organizationId: string, userId: string) => `nextaura_ai_conversations:v1:${organizationId}:${userId}`;

const loadConversations = (organizationId: string, userId: string): Conversation[] => {
  try {
    const stored = localStorage.getItem(storageKey(organizationId, userId));
    if (stored) {
      const parsed = JSON.parse(stored) as Conversation[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 20);
    }
  } catch {
    // Conversation history remains available for the current session.
  }
  return [createConversation()];
};

export const NextAuraAI: React.FC = () => {
  const { currentOrg, user, activeServices, activeApp, navigate } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations(currentOrg.id, user.id));
  const [activeConversationId, setActiveConversationId] = useState(() => conversations[0].id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [retryPrompt, setRetryPrompt] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) || conversations[0];
  const firstName = user.name.split(' ')[0] || 'there';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const key = storageKey(currentOrg.id, user.id);
    try {
      localStorage.setItem(key, JSON.stringify(conversations.slice(0, 20)));
    } catch {
      // Storage can be unavailable in private browsing; the live conversation still works.
    }
  }, [conversations, currentOrg.id, user.id]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeConversation?.messages.length, isLoading]);

  const updateConversation = (conversationId: string, updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? updater(conversation) : conversation));
  };

  const startNewConversation = () => {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current].slice(0, 20));
    setActiveConversationId(conversation.id);
    setInput('');
    setError(null);
    setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const completeRequest = async (conversationId: string, requestMessages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await nextAuraAIService.ask(currentOrg.id, activeApp, requestMessages);
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
        sources: response.sources,
        actions: response.actions,
        provider: response.model ? `${response.provider} · ${response.model}` : response.provider,
      };
      updateConversation(conversationId, (conversation) => ({ ...conversation, messages: [...conversation.messages, assistantMessage] }));
      setRetryPrompt('');
    } catch (caught) {
      const aiError = caught instanceof NextAuraAIError ? caught : new NextAuraAIError('NextAura AI could not complete this request.');
      setError({ message: aiError.message, code: aiError.code });
    } finally {
      setIsLoading(false);
    }
  };

  const sendPrompt = async (prompt: string) => {
    const content = prompt.trim();
    if (!content || isLoading || !activeConversation) return;

    const conversationId = activeConversation.id;
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    const requestMessages = [...activeConversation.messages, userMessage].map(({ role, content: messageContent }) => ({ role, content: messageContent }));

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: conversation.messages.length === 0 ? content.slice(0, 52) : conversation.title,
      messages: [...conversation.messages, userMessage],
    }));
    setInput('');
    setRetryPrompt(content);
    await completeRequest(conversationId, requestMessages);
  };

  const retryLastRequest = async () => {
    if (!activeConversation || isLoading) return;
    const requestMessages = activeConversation.messages.map(({ role, content }) => ({ role, content }));
    await completeRequest(activeConversation.id, requestMessages);
  };

  const copyMessage = async (message: ConversationMessage) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId(null), 1600);
  };

  const openAction = (action: AIResponseAction) => navigate(action.app, action.subView || 'overview');

  const renderHistoryPanel = () => (
    <aside aria-label="Conversation history" className="flex h-full min-h-0 flex-col border-e border-slate-200 bg-[#FAFAF8]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4 text-slate-500" />Conversations</div>
        <button type="button" onClick={() => setHistoryOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close conversation history"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-3">
        <button type="button" onClick={startNewConversation} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50">
          <Plus className="h-4 w-4" />New conversation
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {conversations.map((conversation) => (
          <button
            type="button"
            key={conversation.id}
            onClick={() => { setActiveConversationId(conversation.id); setHistoryOpen(false); setError(null); }}
            className={`mb-1 w-full rounded-lg px-3 py-2.5 text-start transition-colors ${activeConversationId === conversation.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
          >
            <span className="block truncate text-xs font-medium">{conversation.title}</span>
            <span className="mt-1 block text-[11px] text-slate-500">{conversation.messages.length} message{conversation.messages.length === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>
    </aside>
  );

  const renderContextPanel = () => (
    <aside aria-label="Request context" className="h-full border-s border-slate-200 bg-[#FAFAF8] p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><PanelRight className="h-4 w-4 text-slate-500" />Request context</h2>
        <button type="button" onClick={() => setContextOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 2xl:hidden" aria-label="Close context panel"><X className="h-4 w-4" /></button>
      </div>
      <dl className="mt-6 space-y-5 text-xs">
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500"><Building2 className="h-4 w-4" />Workspace</dt>
          <dd className="mt-1.5 font-semibold text-slate-900">{currentOrg.name}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500"><Layers3 className="h-4 w-4" />Active services</dt>
          <dd className="mt-1.5 text-slate-700">{activeServices.length} enabled for this workspace</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500"><MessageSquareText className="h-4 w-4" />Current context</dt>
          <dd className="mt-1.5 text-slate-700">NextAura AI workspace</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500"><ShieldCheck className="h-4 w-4" />Permission scope</dt>
          <dd className="mt-1.5 leading-5 text-slate-700">Membership and role are verified server-side for every request. Tenant RLS stays active.</dd>
        </div>
      </dl>
      <div className="mt-7 border-t border-slate-200 pt-5 text-[11px] leading-5 text-slate-500">
        NextAura AI only receives relevant, permitted workspace fields. It cannot silently create, approve, send, or delete records.
      </div>
    </aside>
  );

  return (
    <div className="-mx-4 -my-5 h-[calc(100vh-4rem)] min-h-[640px] sm:-mx-6 sm:-my-7 xl:-mx-10 xl:-my-9">
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden border-y border-slate-200 bg-white lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)_270px]">
        <div className="hidden min-h-0 lg:block">{renderHistoryPanel()}</div>

        <section className="flex min-h-0 min-w-0 flex-col bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <NextAuraAIIcon className="h-9 w-9 shrink-0" title="NextAura AI" />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-slate-900">NextAura AI</h1>
                <p className="truncate text-xs text-slate-500">Your AI employee for NextAura</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setHistoryOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open conversation history"><Menu className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={() => setContextOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 2xl:hidden" aria-label="Open request context"><PanelRight className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={startNewConversation} className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:flex"><Plus className="h-4 w-4" />New</button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeConversation?.messages.length === 0 ? (
              <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700"><Sparkles className="h-4 w-4" />{greeting}, {firstName}</div>
                  <h2 className="mt-4 text-3xl font-medium tracking-[-0.035em] text-slate-900 sm:text-4xl">I’m NextAura AI.</h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">I understand how NextAura works and can use permitted records from this workspace. Ask about your business, your team, or the next task you want to complete.</p>
                </div>
                <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2">
                  {suggestions.map(({ label, prompt, icon: Icon }) => (
                    <button key={label} type="button" onClick={() => sendPrompt(prompt)} className="group flex items-start gap-3 bg-white p-4 text-start transition-colors hover:bg-[#FAFAF8]">
                      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue-700" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{prompt}</span>
                      </span>
                      <ArrowRight className="ms-auto mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-700 rtl:rotate-180" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-7 sm:py-10">
                <div className="space-y-8">
                  {activeConversation.messages.map((message) => (
                    <article key={message.id} className={message.role === 'user' ? 'ms-auto max-w-[85%]' : 'max-w-full'}>
                      {message.role === 'user' ? (
                        <div className="rounded-2xl rounded-ee-sm bg-[#EFF4F1] px-4 py-3 text-sm leading-6 text-slate-800">{message.content}</div>
                      ) : (
                        <div className="flex items-start gap-3.5">
                          <NextAuraAIIcon className="mt-0.5 h-8 w-8 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{message.content}</div>
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-5 border-t border-slate-200 pt-4">
                                <p className="text-[11px] font-semibold text-slate-500">Workspace sources</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {message.sources.map((source) => <span key={source.key} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">{source.label} · {source.detail}</span>)}
                                </div>
                              </div>
                            )}
                            {message.actions && message.actions.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {message.actions.map((action) => <button type="button" key={`${action.app}-${action.label}`} onClick={() => openAction(action)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">{action.label}<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></button>)}
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                              {message.provider && <span>{message.provider}</span>}
                              <button type="button" onClick={() => copyMessage(message)} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-slate-100 hover:text-slate-700" aria-label="Copy AI answer">
                                {copiedMessageId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedMessageId === message.id ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-3.5" role="status" aria-live="polite">
                      <NextAuraAIIcon className="h-8 w-8 shrink-0" />
                      <div className="flex items-center gap-1.5 pt-3"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" /><span className="sr-only">NextAura AI is working</span></div>
                    </div>
                  )}
                  <div ref={conversationEndRef} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
            {error && (
              <div className="mx-auto mb-3 flex max-w-3xl items-start justify-between gap-4 border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="alert">
                <div><p className="font-semibold">{error.code === 'PROVIDER_NOT_CONFIGURED' ? 'AI provider not connected' : 'Request not completed'}</p><p className="mt-1 leading-5">{error.message}</p></div>
                {retryPrompt && error.code !== 'PROVIDER_NOT_CONFIGURED' && <button type="button" onClick={retryLastRequest} className="inline-flex shrink-0 items-center gap-1.5 font-semibold hover:text-amber-700"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}
              </div>
            )}
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-300 bg-white p-2 shadow-[0_8px_24px_rgba(30,41,59,.06)] focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    sendPrompt(input);
                  }
                }}
                rows={2}
                maxLength={4000}
                placeholder="Ask anything about your workspace…"
                aria-label="Message NextAura AI"
                className="max-h-36 min-h-14 w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[11px] text-slate-500">Enter to send · Shift + Enter for a new line</span>
                <button type="button" disabled={!input.trim() || isLoading} onClick={() => sendPrompt(input)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#285143] text-white transition-colors hover:bg-[#1F4136] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </section>

        <div className="hidden min-h-0 2xl:block">{renderContextPanel()}</div>
      </div>

      {historyOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-slate-900/25" onClick={() => setHistoryOpen(false)} aria-label="Close conversation history" /><div className="absolute inset-y-0 start-0 w-[min(86vw,300px)] shadow-2xl">{renderHistoryPanel()}</div></div>}
      {contextOpen && <div className="fixed inset-0 z-50 2xl:hidden"><button type="button" className="absolute inset-0 bg-slate-900/25" onClick={() => setContextOpen(false)} aria-label="Close context panel" /><div className="absolute inset-y-0 end-0 w-[min(88vw,320px)] overflow-y-auto bg-[#FAFAF8] shadow-2xl">{renderContextPanel()}</div></div>}
    </div>
  );
};
