import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Clipboard,
  Copy,
  Eraser,
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
import { MessageResponse } from '../../components/ai-elements/message';
import {
  nextAuraAIService,
  NextAuraAIError,
  type AIResponseAction,
  type AIResponseSource,
  type AIResponseSuggestion,
} from '../../services/nextAuraAIService';
import type { ConversationContext, LocalAIIntent } from '../../ai/types';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: AIResponseSource[];
  actions?: AIResponseAction[];
  suggestions?: AIResponseSuggestion[];
  intent?: LocalAIIntent;
  confidence?: number;
  conversationContext?: ConversationContext;
  engine?: string;
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
  const { currentOrg, user, activeServices, aiEntryContext, navigate } = useApp();
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

  const clearConversation = () => {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: 'New conversation',
      messages: [],
    }));
    setInput('');
    setRetryPrompt('');
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const completeRequest = async (conversationId: string, requestMessages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await nextAuraAIService.ask(
        currentOrg.id,
        aiEntryContext.app,
        aiEntryContext.subView,
        requestMessages,
        { name: currentOrg.name, role: user.role, activeServices },
      );
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
        sources: response.sources,
        actions: response.actions,
        suggestions: response.suggestions,
        intent: response.intent,
        confidence: response.confidence,
        conversationContext: response.conversationContext,
        engine: response.engine,
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
    <aside aria-label="Conversation history" className="flex h-full min-h-0 flex-col border-e border-slate-200 dark:border-[#1F253D] bg-[#FAFAF8] dark:bg-[#131728]">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1F253D] px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]"><History className="h-4 w-4 text-[#7568E8] dark:text-[#867AF0]" />Conversations</div>
        <button type="button" onClick={() => setHistoryOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-[#A3ABC5] hover:bg-slate-100 dark:hover:bg-[#161B30] lg:hidden" aria-label="Close conversation history"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-3">
        <button type="button" onClick={startNewConversation} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-[#2A3048] bg-white dark:bg-[#161B30] px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-[#F4F6FF] transition-all hover:border-[#7568E8] hover:bg-slate-50 dark:hover:bg-[#1A2035] shadow-xs">
          <Plus className="h-4 w-4 text-[#7568E8]" />New conversation
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {conversations.map((conversation) => (
          <button
            type="button"
            key={conversation.id}
            onClick={() => { setActiveConversationId(conversation.id); setHistoryOpen(false); setError(null); }}
            className={`mb-1 w-full rounded-xl px-3 py-2.5 text-start transition-all ${activeConversationId === conversation.id ? 'bg-white dark:bg-[#161B30] text-slate-900 dark:text-[#F4F6FF] shadow-sm ring-1 ring-slate-200 dark:ring-[#7568E8]/40 border-s-2 border-s-[#7568E8]' : 'text-slate-600 dark:text-[#A3ABC5] hover:bg-white/70 dark:hover:bg-[#161B30]/50 hover:text-slate-900 dark:hover:text-[#F4F6FF]'}`}
          >
            <span className="block truncate text-xs font-medium">{conversation.title}</span>
            <span className="mt-1 block text-[11px] text-slate-500 dark:text-[#6B7694]">{conversation.messages.length} message{conversation.messages.length === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>
    </aside>
  );

  const renderContextPanel = () => (
    <aside aria-label="Request context" className="h-full border-s border-slate-200 dark:border-[#1F253D] bg-[#FAFAF8] dark:bg-[#131728] p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]"><PanelRight className="h-4 w-4 text-[#7568E8] dark:text-[#867AF0]" />Request context</h2>
        <button type="button" onClick={() => setContextOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-[#A3ABC5] hover:bg-slate-100 dark:hover:bg-[#161B30] 2xl:hidden" aria-label="Close context panel"><X className="h-4 w-4" /></button>
      </div>
      <dl className="mt-6 space-y-5 text-xs">
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500 dark:text-[#A3ABC5]"><Building2 className="h-4 w-4" />Workspace</dt>
          <dd className="mt-1.5 font-semibold text-slate-900 dark:text-[#F4F6FF]">{currentOrg.name}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500 dark:text-[#A3ABC5]"><Layers3 className="h-4 w-4" />Active services</dt>
          <dd className="mt-1.5 text-slate-700 dark:text-slate-300">{activeServices.length} enabled for this workspace</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500 dark:text-[#A3ABC5]"><MessageSquareText className="h-4 w-4" />Current context</dt>
          <dd className="mt-1.5 capitalize text-slate-700 dark:text-slate-300 font-mono">{aiEntryContext.app} / {aiEntryContext.subView}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium text-slate-500 dark:text-[#A3ABC5]"><ShieldCheck className="h-4 w-4" />Permission scope</dt>
          <dd className="mt-1.5 leading-5 text-slate-700 dark:text-slate-300">Membership and role are verified server-side for every request. Tenant RLS stays active.</dd>
        </div>
      </dl>
      <div className="mt-7 border-t border-slate-200 dark:border-[#1F253D] pt-5 text-[11px] leading-5 text-slate-500 dark:text-[#A3ABC5]">
        Answers are generated by NextAura's local rules and knowledge base. Relevant workspace data remains tenant-scoped and permission-aware.
      </div>
    </aside>
  );

  return (
    <div className="-mx-4 -my-5 h-[calc(100vh-4rem)] min-h-[640px] sm:-mx-6 sm:-my-7 xl:-mx-10 xl:-my-9">
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden border-y border-slate-200 dark:border-[#1F253D] bg-white dark:bg-[#090B1A] lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)_270px]">
        <div className="hidden min-h-0 lg:block">{renderHistoryPanel()}</div>

        <section className="flex min-h-0 min-w-0 flex-col bg-white dark:bg-[#090B1A]">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1F253D] px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <NextAuraAIIcon className="h-9 w-9 shrink-0" title="NextAura AI" />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">NextAura AI</h1>
                <p className="truncate text-xs text-slate-500 dark:text-[#A3ABC5]">Your intelligent NextAura assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setHistoryOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 dark:text-[#A3ABC5] hover:bg-slate-100 dark:hover:bg-[#161B30] lg:hidden" aria-label="Open conversation history"><Menu className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={() => setContextOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 dark:text-[#A3ABC5] hover:bg-slate-100 dark:hover:bg-[#161B30] 2xl:hidden" aria-label="Open request context"><PanelRight className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={clearConversation} disabled={!activeConversation?.messages.length} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 dark:text-[#A3ABC5] hover:bg-slate-100 dark:hover:bg-[#161B30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7568E8] disabled:cursor-not-allowed disabled:opacity-35" aria-label="Clear conversation"><Eraser className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={startNewConversation} className="hidden items-center gap-2 rounded-xl border border-slate-200 dark:border-[#2A3048] bg-white dark:bg-[#161B30] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#F4F6FF] hover:bg-slate-50 dark:hover:bg-[#1A2035] sm:flex"><Plus className="h-4 w-4 text-[#7568E8]" />New</button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeConversation?.messages.length === 0 ? (
              <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#7568E8] dark:text-[#867AF0]"><Sparkles className="h-4 w-4" />{greeting}, {firstName}</div>
                  <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-slate-900 dark:text-[#F4F6FF] sm:text-4xl">I’m NextAura AI.</h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-[#A3ABC5]">I understand how NextAura works and can use permitted records from this workspace. Ask about your business, your team, or the next task you want to complete.</p>
                </div>
                <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1F253D] bg-slate-200 dark:bg-[#1F253D] sm:grid-cols-2">
                  {suggestions.map(({ label, prompt, icon: Icon }) => (
                    <button key={label} type="button" onClick={() => sendPrompt(prompt)} className="group flex items-start gap-3 bg-white dark:bg-[#161B30] p-4 text-start transition-colors hover:bg-slate-50 dark:hover:bg-[#1A2035]">
                      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#7568E8] dark:text-[#867AF0]" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-[#A3ABC5]">{prompt}</span>
                      </span>
                      <ArrowRight className="ms-auto mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 transition-colors group-hover:text-[#7568E8] rtl:rotate-180" />
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
                        <div className="rounded-2xl rounded-ee-sm bg-[#EFF4F1] dark:bg-[#7568E8]/20 dark:border dark:border-[#7568E8]/30 px-4 py-3 text-sm leading-6 text-slate-800 dark:text-[#F4F6FF] shadow-xs">{message.content}</div>
                      ) : (
                        <div className="flex items-start gap-3.5">
                          <NextAuraAIIcon className="mt-0.5 h-8 w-8 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <MessageResponse className="text-[15px] leading-7 text-slate-800 dark:text-[#F4F6FF]">{message.content}</MessageResponse>
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-5 border-t border-slate-200 dark:border-[#1F253D] pt-4">
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-[#A3ABC5]">Workspace sources</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {message.sources.map((source) => <span key={source.key} className="rounded-full border border-slate-200 dark:border-[#1F253D] bg-slate-50 dark:bg-[#161B30] px-2.5 py-1 text-[11px] text-slate-600 dark:text-[#A3ABC5]">{source.label} · {source.detail}</span>)}
                                </div>
                              </div>
                            )}
                            {message.actions && message.actions.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {message.actions.map((action) => <button type="button" key={`${action.app}-${action.label}`} onClick={() => openAction(action)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-[#2A3048] bg-white dark:bg-[#161B30] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#F4F6FF] hover:border-[#7568E8] dark:hover:bg-[#1A2035] transition-all">{action.label}<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></button>)}
                              </div>
                            )}
                            {message.suggestions && message.suggestions.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2" aria-label="Suggested follow-up questions">
                                {message.suggestions.map((suggestion) => (
                                  <button
                                    type="button"
                                    key={suggestion.prompt}
                                    onClick={() => sendPrompt(suggestion.prompt)}
                                    disabled={isLoading}
                                    className="rounded-full border border-[#7568E8]/30 bg-[#7568E8]/10 px-3 py-1.5 text-xs font-medium text-[#7568E8] dark:text-[#867AF0] transition-colors hover:bg-[#7568E8]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7568E8] disabled:opacity-50"
                                  >
                                    {suggestion.label}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400 dark:text-[#6B7694]">
                              {message.engine && <span>{message.engine}</span>}
                              <button type="button" onClick={() => copyMessage(message)} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-[#161B30] hover:text-slate-700 dark:hover:text-[#F4F6FF]" aria-label="Copy AI answer">
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
                      <div className="flex items-center gap-1.5 pt-3"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7568E8]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7568E8] [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7568E8] [animation-delay:240ms]" /><span className="sr-only">NextAura AI is working</span></div>
                    </div>
                  )}
                  <div ref={conversationEndRef} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-[#1F253D] bg-white dark:bg-[#090B1A] px-4 py-4 sm:px-6">
            {error && (
              <div className="mx-auto mb-3 flex max-w-3xl items-start justify-between gap-4 border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-900 dark:text-amber-300 rounded-xl" role="alert">
                <div><p className="font-semibold">Request not completed</p><p className="mt-1 leading-5">{error.message}</p></div>
                {retryPrompt && <button type="button" onClick={retryLastRequest} className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#7568E8] dark:text-[#867AF0] hover:underline"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}
              </div>
            )}
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-300 dark:border-[#2A3048] bg-white dark:bg-[#161B30] p-2 shadow-sm focus-within:border-[#7568E8] focus-within:ring-2 focus-within:ring-[#7568E8]/20 transition-all">
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
                className="max-h-36 min-h-14 w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 text-slate-900 dark:text-[#F4F6FF] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[11px] text-slate-500 dark:text-[#A3ABC5]">Enter to send · Shift + Enter for a new line</span>
                <button type="button" disabled={!input.trim() || isLoading} onClick={() => sendPrompt(input)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white shadow-[0_0_12px_rgba(117,104,232,0.35)] transition-all disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </section>

        <div className="hidden min-h-0 2xl:block">{renderContextPanel()}</div>
      </div>

      {historyOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setHistoryOpen(false)} aria-label="Close conversation history" /><div className="absolute inset-y-0 start-0 w-[min(86vw,300px)] shadow-2xl">{renderHistoryPanel()}</div></div>}
      {contextOpen && <div className="fixed inset-0 z-50 2xl:hidden"><button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setContextOpen(false)} aria-label="Close context panel" /><div className="absolute inset-y-0 end-0 w-[min(88vw,320px)] overflow-y-auto bg-[#FAFAF8] dark:bg-[#131728] shadow-2xl">{renderContextPanel()}</div></div>}
    </div>
  );
};
