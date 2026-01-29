import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, Send, Bot, User } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { cn } from './ui/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  className?: string;
}

const SYSTEM_PROMPT = `You are TARANG AI, an intelligent assistant for the Tarang Hazard Response Platform - India's disaster management and ocean hazard monitoring system.

Your role:
1. Help users navigate the platform (reporting hazards, viewing maps, volunteering, donations)
2. Provide disaster preparedness and safety information
3. Answer questions about ocean hazards (tsunamis, cyclones, storm surges)
4. Guide users on emergency procedures and contacts

Key platform features:
- Report Hazard: Report disasters with photos, location, AI-assisted analysis
- Map View: Real-time hazard monitoring across India
- Field Verification: Responders verify hazards on-ground
- Volunteer Registration: Citizens register as emergency volunteers
- Donation Portal: Contribute to relief efforts

Emergency Contacts in India:
- NDRF: 011-26107953 | INCOIS: 1800-425-7910 | Coast Guard: 1554
- Fire: 101 | Ambulance: 102 | Police: 100

Be helpful and concise. If user is in emergency, provide emergency contacts immediately.
Respond in the same language the user uses (English/Hindi). Keep responses under 100 words.`;

export function ChatBot({ className }: ChatBotProps) {
  const { t } = useTranslation();
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
        text: "🌊 नमस्ते! I'm TARANG AI powered by Gemini.\n\nI can help with:\n• Reporting hazards\n• Emergency contacts\n• Disaster preparedness\n\nHow can I assist you?",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setTimeout(() => setMessages([]), 300);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendToGemini = async (userMessage: string, history: Message[]): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const conversationHistory = history
      .filter(m => m.id !== 'welcome')
      .map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const fullPrompt = `${SYSTEM_PROMPT}\n\n${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ''}User: ${userMessage}\n\nAssistant:`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  };

  const handleSendMessage = async () => {
    const messageText = inputValue.trim();
    if (!messageText || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await sendToGemini(messageText, messages);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      console.error('Gemini API error:', error);
      let errorMsg = 'Sorry, I encountered an error. Please try again.';
      if (error.message?.includes('429')) {
        errorMsg = 'I\'m receiving too many requests. Please wait a moment and try again.';
      }
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: errorMsg,
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
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 md:bottom-6 md:right-6 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg bg-[#0077B6] hover:bg-[#005a8c] z-40",
          className
        )}
        size="icon"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0 h-full">
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-[#0077B6]" />
              <SheetTitle>TARANG AI</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Powered by Google Gemini
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0 px-4 py-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start space-x-2",
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.sender === 'bot' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#0077B6] flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      message.sender === 'user'
                        ? 'bg-[#0077B6] text-white'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    )}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#0077B6] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t px-4 py-3 flex-shrink-0">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                size="icon"
                className="bg-[#0077B6] hover:bg-[#005a8c]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by Google Gemini AI
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
