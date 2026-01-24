import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, Send, Bot, User } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { cn } from './ui/utils';
import { chatWithBot } from '../services/apiService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  className?: string;
}

export function ChatBot({ className }: ChatBotProps) {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        text: t('chatbot.welcome'),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, t]);

  // Reset messages when chat closes
  useEffect(() => {
    if (!isOpen) {
      // Clear messages after a short delay to allow animation
      setTimeout(() => {
        setMessages([]);
      }, 300);
    }
  }, [isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Enhanced rule-based chatbot logic with more conversation patterns
  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase().trim();

    // Greetings - expanded patterns
    if (lowerMessage.match(/^(hi|hello|hey|hi there|hey there|namaste|namaskar|good morning|good afternoon|good evening|good night|sup|what\'?s up|howdy|नमस्ते|हैलो|नमस्कार|क्या हाल|कैसे हो)$/i)) {
      return t('chatbot.greeting');
    }

    // Help
    if (lowerMessage.match(/\b(help|sahayata|madad|what can you do|kya kar sakte ho|मदद|सहायता)\b/i)) {
      return t('chatbot.help');
    }

    // Report hazard
    if (lowerMessage.match(/\b(report|hazard|danger|trouble|sankat|report hazard|report a hazard|how to report|खतरा|रिपोर्ट)\b/i)) {
      return t('chatbot.reportHazard');
    }

    // Donate
    if (lowerMessage.match(/\b(donate|donation|contribute|dana|how to donate|दान|योगदान)\b/i)) {
      return t('chatbot.donate');
    }

    // Volunteer
    if (lowerMessage.match(/\b(volunteer|volunteer registration|swayamsevak|register as volunteer|स्वयंसेवक)\b/i)) {
      return t('chatbot.volunteer');
    }

    // Map
    if (lowerMessage.match(/\b(map|location|where|where is|nakshe|location map|नक्शा|मानचित्र)\b/i)) {
      return t('chatbot.map');
    }

    // Hazard drills
    if (lowerMessage.match(/\b(drill|safety drill|hazard drill|abhyas|safety tips|अभ्यास|ड्रिल)\b/i)) {
      return t('chatbot.hazardDrills');
    }

    // Emergency contacts
    if (lowerMessage.match(/\b(emergency|contact|phone|helpline|aatankit|aatank|aatankwadi|aatankwadi contacts|आपातकालीन|संपर्क)\b/i)) {
      return t('chatbot.emergency');
    }

    // Login/Register
    if (lowerMessage.match(/\b(login|register|sign up|sign in|account|login karna|register karna|लॉगिन|पंजीकरण)\b/i)) {
      return t('chatbot.login');
    }

    // Weather
    if (lowerMessage.match(/\b(weather|mausam|forecast|rain|storm|cyclone|मौसम|मौसम पूर्वानुमान)\b/i)) {
      return t('chatbot.weather');
    }

    // Safe fishing spots
    if (lowerMessage.match(/\b(fishing|fisherman|fish|machhli|safe fishing|fishing spots|मछली|मछुआरा)\b/i)) {
      return t('chatbot.fishing');
    }

    // What is Tarang/INCOIS
    if (lowerMessage.match(/\b(what is tarang|what is incois|tarang kya hai|incois kya hai|about|तरंग क्या है|इन्कोइस क्या है)\b/i)) {
      return t('chatbot.about');
    }

    // Thank you - expanded patterns
    if (lowerMessage.match(/\b(thank|thanks|thank you|dhanyavad|shukriya|appreciate|grateful|धन्यवाद|शुक्रिया|बहुत धन्यवाद)\b/i)) {
      return t('chatbot.thanks');
    }

    // Goodbye/Farewell
    if (lowerMessage.match(/\b(bye|goodbye|see you|farewell|take care|alvida|अलविदा|फिर मिलेंगे)\b/i)) {
      return t('chatbot.goodbye');
    }

    // Yes/No responses
    if (lowerMessage.match(/^(yes|yeah|yep|sure|ok|okay|of course|certainly|हाँ|हां|जी हाँ|बिल्कुल)$/i)) {
      return t('chatbot.positive');
    }

    if (lowerMessage.match(/^(no|nope|nah|not really|नहीं|जी नहीं)$/i)) {
      return t('chatbot.negative');
    }

    // What/How/Where/When questions about features
    if (lowerMessage.match(/\b(what is|what\'?s|kya hai|क्या है)\b.*\b(tarang|incois|platform|app|application)\b/i)) {
      return t('chatbot.about');
    }

    if (lowerMessage.match(/\b(how to|how do|how can|kaise|कैसे)\b.*\b(login|register|sign up|sign in)\b/i)) {
      return t('chatbot.login');
    }

    if (lowerMessage.match(/\b(where|kahan|कहाँ|कहां)\b.*\b(fishing|safe|spots|place)\b/i)) {
      return t('chatbot.fishing');
    }

    if (lowerMessage.match(/\b(when|kab|कब)\b.*\b(emergency|help|contact)\b/i)) {
      return t('chatbot.emergency');
    }

    // Default response
    return t('chatbot.default');
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

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        text: m.text,
        sender: m.sender
      }));

      const result = await chatWithBot(messageText, history);

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: result.response || t('chatbot.error'),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: t('chatbot.error'),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
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

  // Suggested questions - show after welcome or after bot reply
  const getSuggestedQuestions = () => {
    const lastMessage = messages[messages.length - 1];
    const isFirstMessage = messages.length === 1;
    const isAfterBotReply = lastMessage && lastMessage.sender === 'bot' && messages.length > 1;

    // Show suggestions after welcome message or after bot replies
    if (isFirstMessage || isAfterBotReply) {
      return [
        t('chatbot.suggestions.report'),
        t('chatbot.suggestions.donate'),
        t('chatbot.suggestions.volunteer'),
        t('chatbot.suggestions.map'),
        t('chatbot.suggestions.emergency'),
        t('chatbot.suggestions.drills'),
        t('chatbot.suggestions.fishing'),
        t('chatbot.suggestions.weather'),
      ];
    }
    return [];
  };

  const suggestedQuestions = getSuggestedQuestions();

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 md:bottom-6 md:right-6 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg bg-[#0077B6] hover:bg-[#005a8c] z-40 flex items-center justify-center",
          className
        )}
        size="icon"
        aria-label={t('chatbot.open')}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Window */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0 h-full">
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-[#0077B6]" />
              <SheetTitle>{t('chatbot.title')}</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              {t('chatbot.description')}
            </SheetDescription>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-0 px-4 py-4">
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

            {/* Suggested Questions - show after welcome or after bot replies */}
            {suggestedQuestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{t('chatbot.suggestedQuestions')}:</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputValue(question);
                        setTimeout(() => {
                          const messageText = question;
                          const userMessage: Message = {
                            id: Date.now().toString(),
                            text: messageText,
                            sender: 'user',
                            timestamp: new Date(),
                          };
                          setMessages((prev) => [...prev, userMessage]);
                          setIsTyping(true);
                          setTimeout(async () => {
                            const botResponse: Message = {
                              id: (Date.now() + 1).toString(),
                              text: getBotResponse(messageText),
                              sender: 'bot',
                              timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, botResponse]);
                            setIsTyping(false);
                          }, 500);
                        }, 100);
                      }}
                      className="w-full text-left px-3 py-2 text-xs bg-muted hover:bg-muted/80 hover:bg-[#0077B6]/10 rounded-lg transition-colors border border-border hover:border-[#0077B6] cursor-pointer"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t px-4 py-3 flex-shrink-0">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chatbot.placeholder')}
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
              {t('chatbot.footer')}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

