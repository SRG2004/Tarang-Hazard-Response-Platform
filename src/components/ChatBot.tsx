import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { MessageCircle, Send, Bot, User, X, Sparkles, AlertCircle, MapPin, Heart, Phone } from 'lucide-react';
import { cn } from './ui/utils';
import { sendChatMessage } from '../services/apiService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  className?: string;
}

const quickActions = [
  { icon: AlertCircle, label: 'Report Hazard', prompt: 'How do I report a hazard?' },
  { icon: Phone, label: 'Emergency', prompt: 'What are the emergency contact numbers?' },
  { icon: MapPin, label: 'View Map', prompt: 'How can I view the hazard map?' },
  { icon: Heart, label: 'Volunteer', prompt: 'How can I register as a volunteer?' },
];

export function ChatBot({ className }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: "🌊 नमस्ते! I'm TARANG AI, your disaster management assistant.\n\nI have access to real-time hazard reports. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSendMessage = async (messageText?: string) => {
    const text = (messageText || inputValue).trim();
    if (!text || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Filter history to send only relevant fields to backend
      const historyToSend = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          text: m.text,
          sender: m.sender
        }));

      const responseText = await sendChatMessage(text, historyToSend);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: error.message || "I'm having trouble connecting to the server. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button with pulse animation */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 md:bottom-6 md:right-6 h-14 w-14 md:h-16 md:w-16 rounded-full z-40 flex items-center justify-center transition-all duration-300 hover:scale-110 group",
          "bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-lg shadow-blue-500/30",
          className
        )}
        aria-label="Open chat"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 animate-ping opacity-20"></div>
        <MessageCircle className="h-7 w-7 text-white group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
      </button>

      {/* Chat Window */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] flex flex-col p-0 h-full border-0 bg-transparent shadow-2xl"
        >
          {/* Accessibility Title (Hidden) */}
          <div className="sr-only">
            <SheetTitle>Tarang AI Assistant</SheetTitle>
            <SheetDescription>Chat with Tarang AI for disaster management assistance</SheetDescription>
          </div>

          {/* Glassmorphism container */}
          <div className="flex flex-col h-full bg-gradient-to-b from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl">
            {/* Header with gradient */}
            <div className="relative px-5 py-4 flex-shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700"></div>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg flex items-center gap-2">
                      TARANG AI V2
                      <Sparkles className="h-4 w-4 text-yellow-300" />
                    </h2>
                    <p className="text-xs text-cyan-100 italic">Server-Side RAG • Real-Time Data</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
            >
              {messages.map((message, idx) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {message.sender === 'bot' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg",
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-700/80 text-slate-100 rounded-bl-sm border border-slate-600/50'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                    <p className={cn(
                      "text-[10px] mt-1.5",
                      message.sender === 'user' ? 'text-cyan-100' : 'text-slate-400'
                    )}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-200" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2 animate-in fade-in-0">
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-slate-700/80 rounded-2xl rounded-bl-sm px-4 py-3 border border-slate-600/50">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 animate-pulse self-center ml-2">Searching database...</div>
                </div>
              )}

              {/* Quick Actions - show after welcome */}
              {messages.length === 1 && !isTyping && (
                <div className="pt-2 space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                  <p className="text-xs text-slate-400 font-medium px-1">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(action.prompt)}
                        className="flex items-center gap-2 px-3 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 hover:border-cyan-500/50 rounded-xl text-left transition-all duration-200 group"
                      >
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-colors">
                          <action.icon className="h-4 w-4 text-cyan-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-200">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-slate-700/50 bg-slate-800/50">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isTyping}
                  className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                >
                  <Send className="h-5 w-5 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-2">
                ✨ Powered by Tarang RAG Intelligence
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet >
    </>
  );
}
