import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, MessageSquare, Plus, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AGENT_NAME = 'vision_agent';

export default function VisionAgent() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to streaming updates for the active conversation
  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [activeId]);

  const loadConversations = async () => {
    setLoadingList(true);
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
      if (list && list.length > 0 && !activeId) {
        openConversation(list[0].id, list[0]);
      }
    } catch (e) {
      console.error('Error listing conversations', e);
    } finally {
      setLoadingList(false);
    }
  };

  const openConversation = (id, conv) => {
    setActiveId(id);
    setMessages(conv?.messages || []);
  };

  const startNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'Vision Chat', description: 'Conversation with the openTILL Vision Agent' }
      });
      setConversations(prev => [conv, ...prev]);
      openConversation(conv.id, conv);
    } catch (e) {
      console.error('Error creating conversation', e);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    let convId = activeId;
    let currentConv = conversations.find(c => c.id === activeId);

    // Auto-create a conversation if none exists yet
    if (!convId) {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: 'Vision Chat', description: 'Conversation with the openTILL Vision Agent' }
        });
        convId = conv.id;
        currentConv = conv;
        setConversations(prev => [conv, ...prev]);
        setActiveId(convId);
      } catch (e) {
        console.error('Error creating conversation', e);
        return;
      }
    }

    setInput('');
    setSending(true);
    try {
      await base44.agents.addMessage(currentConv, { role: 'user', content: text });
    } catch (e) {
      console.error('Error sending message', e);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">openTILL Vision Agent</h1>
              <p className="text-sm text-gray-500">Chat about the openTILL SMPF vision, $DUC, ambassadors &amp; builders</p>
            </div>
          </div>

          {/* Channel connect links */}
          <div className="flex flex-wrap items-center gap-2">
            <a href={base44.agents.getWhatsAppConnectURL(AGENT_NAME)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2 fill-current" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.043zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                WhatsApp
              </Button>
            </a>
            <a href={base44.agents.getTelegramConnectURL(AGENT_NAME)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2 fill-current" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.092.08.641.119 1.273.04.632.04 1.27.04 1.27l-.08 1.725a47.93 47.93 0 01-.219 3.097c-.14 1.044-.297 1.674-.297 1.674s-.12.375-.413.413c-.293.038-.676-.149-.676-.149s-1.094-.632-1.808-1.187c-.39-.305-1.224-1.215-1.624-1.674-.249-.286-.043-.434.171-.595.297-.224.59-.466.836-.717.247-.25.297-.375.413-.621.116-.247.046-.413-.025-.59-.071-.179-.621-1.49-.836-1.974-.214-.484-.43-.42-.621-.42h-.595s-.495.071-.742.297c-.247.224-.836.836-.836.836s-.321.371-.321 1.066c0 .695.297 1.066.297 1.066s.621 1.49 1.466 2.335c.845.845 1.974 1.187 1.974 1.187s.495.247 1.066.247c.57 0 1.066-.297 1.066-.297l3.842-1.974s.321-.171.321-.413c0-.247-.321-.413-.321-.413l-3.842-1.974s-.495-.297-1.066-.297c-.57 0-1.066.297-1.066.297z"/>
                </svg>
                Telegram
              </Button>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Conversation list */}
          <Card className="lg:col-span-1 h-fit">
            <CardContent className="p-3 space-y-2">
              <Button className="w-full" onClick={startNewConversation}>
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
              {loadingList ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No conversations yet.</p>
              ) : (
                <div className="space-y-1">
                  {conversations.map(c => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id, c)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${c.id === activeId ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-gray-100 text-gray-700'}`}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate">{c.metadata?.name || 'Vision Chat'}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat window */}
          <Card className="lg:col-span-3 flex flex-col" style={{ minHeight: 520 }}>
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 560 }}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <Sparkles className="w-10 h-10 mb-3 text-indigo-400" />
                    <p className="text-sm max-w-sm">
                      Ask me anything about openTILL — our POS, $DUC rewards, the ambassador &amp; builder networks, the chip marketplace, and the road ahead.
                    </p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                        {m.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <ReactMarkdown className="prose prose-sm max-w-none">{m.content || ''}</ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3 flex items-center gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask about the openTILL vision…"
                  disabled={sending}
                />
                <Button onClick={sendMessage} disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}