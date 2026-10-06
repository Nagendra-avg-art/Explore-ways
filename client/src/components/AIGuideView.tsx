import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RotateCcw, 
  MapPin, 
  Clock, 
  Wallet, 
  Compass, 
  ShieldCheck, 
  HelpCircle,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { usePreferences } from '../context/PreferencesContext';
import { useTrip } from '../context/TripContext';
import { usePlaces } from '../context/PlacesContext';
import { useFood } from '../context/FoodContext';
import { 
  ChatMessage, 
  formatAIContext, 
  sendAIChatMessage, 
  fetchAIStatus, 
  AIStatusInfo 
} from '../services/aiGuideService';

const DEFAULT_SUGGESTIONS = [
  'What should I visit first?',
  'Why is this recommended?',
  'What should I eat nearby?',
  'Where can I get vegetarian food?',
  'Can I fit another place?',
  "What's the cheapest option?",
  'Summarize my itinerary.'
];

export const AIGuideView: React.FC = () => {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const { tripRoute } = useTrip();
  const { places: discoveredPlaces } = usePlaces();
  const { foodPlaces } = useFood();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusInfo, setStatusInfo] = useState<AIStatusInfo | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load status on mount
  useEffect(() => {
    fetchAIStatus().then(setStatusInfo);
  }, []);

  // Initialize initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const city = location.city || 'your destination';
      const stopCount = tripRoute.stops?.length || 0;
      
      const welcomeContent = stopCount > 0
        ? `Hello! I'm your **Local Travel Guide** for **${city}**.\n\n` +
          `[APPLICATION DATA] You currently have **${stopCount} stop(s)** scheduled in your trip (` +
          tripRoute.stops.map((s: { name: string }) => s.name).join(', ') + 
          `). I have your complete route, transport options, fares, and timeline loaded.\n\n` +
          `How can I help with your trip today?`
        : `Hello! I'm your **Local Travel Guide** for **${city}**.\n\n` +
          `I can help you discover nearby places, explain recommendations, estimate costs, and optimize your schedule.\n\n` +
          `How can I help with your trip today?`;

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcomeContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'grounded-fallback',
          suggestedFollowUps: DEFAULT_SUGGESTIONS
        }
      ]);
    }
  }, [location.city, tripRoute.stops?.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const contextPayload = formatAIContext(
        location,
        preferences,
        tripRoute,
        discoveredPlaces,
        foodPlaces
      );

      const response = await sendAIChatMessage(
        text,
        contextPayload,
        [...messages, userMessage]
      );

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: response.source,
        groundedFacts: response.groundedFacts,
        suggestedFollowUps: response.suggestedFollowUps || DEFAULT_SUGGESTIONS
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `[APPLICATION DATA] I am temporarily having trouble reaching the travel intelligence service. However, your trip data remains safe and you can view all stops on the Map or My Trip tab.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'grounded-fallback'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetChat = () => {
    const city = location.city || 'your destination';
    const stopCount = tripRoute.stops?.length || 0;
    
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. I'm ready to answer any questions about your trip in **${city}** (${stopCount} stops loaded).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'grounded-fallback',
        suggestedFollowUps: DEFAULT_SUGGESTIONS
      }
    ]);
  };

  // Helper to format message content with custom badges for grounded labels
  const renderFormattedContent = (content: string) => {
    // Split lines
    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />;
          }

          // Check for grounding markers
          let processedLine = line;
          let badge: React.ReactNode = null;

          if (processedLine.includes('[APPLICATION DATA]')) {
            badge = (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 mr-1.5">
                <ShieldCheck className="w-3 h-3 text-sky-600" />
                APPLICATION DATA
              </span>
            );
            processedLine = processedLine.replace('[APPLICATION DATA]', '').trim();
          } else if (processedLine.includes('[ESTIMATE]')) {
            badge = (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 mr-1.5">
                <Clock className="w-3 h-3 text-amber-600" />
                ESTIMATE
              </span>
            );
            processedLine = processedLine.replace('[ESTIMATE]', '').trim();
          } else if (processedLine.includes('[GENERAL INFORMATION]')) {
            badge = (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 mr-1.5">
                <Info className="w-3 h-3 text-purple-600" />
                GENERAL INFO
              </span>
            );
            processedLine = processedLine.replace('[GENERAL INFORMATION]', '').trim();
          }

          // Bullet points
          const isBullet = processedLine.trim().startsWith('•') || processedLine.trim().startsWith('-');
          const isNumberBullet = /^\d+\.\s/.test(processedLine.trim());

          // Simple bold formatting parser
          const renderParts = (text: string) => {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-bold text-slate-900">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            });
          };

          return (
            <div 
              key={idx} 
              className={`${isBullet || isNumberBullet ? 'pl-2 sm:pl-3' : ''} flex flex-wrap items-baseline gap-1`}
            >
              {badge}
              <span className="text-slate-700">
                {renderParts(processedLine)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn pb-12">
      {/* ============================================================== */}
      {/* 1. HEADER & ACTIVE CONTEXT BANNER */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  AI Travel Guide
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {statusInfo?.provider === 'gemini' ? 'Gemini AI' : 'Grounded AI'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Context-aware assistant grounded in your active trip & destinations
              </p>
            </div>
          </div>

          {/* Controls: Reset Chat */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleResetChat}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Live Context Strip: Shows user what AI currently knows */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-600 font-bold block uppercase">Area</span>
              <span className="font-bold text-slate-800 truncate block">
                {location.city || 'Detecting...'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
            <Compass className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-600 font-bold block uppercase">Trip Stops</span>
              <span className="font-bold text-slate-800 truncate block">
                {tripRoute.stops?.length || 0} Places saved
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
            <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-600 font-bold block uppercase">Budget</span>
              <span className="font-bold text-slate-800 truncate block">
                ₹{preferences.budgetAmount || 1000}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-600 font-bold block uppercase">Window</span>
              <span className="font-bold text-slate-800 truncate block">
                {preferences.availableHours || 4}h ({tripRoute.preferredMode})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SUGGESTED QUESTIONS PILLS */}
      {/* ============================================================== */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Suggested Questions
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_SUGGESTIONS.map((suggestion, sIdx) => (
            <button
              key={sIdx}
              onClick={() => handleSendMessage(suggestion)}
              disabled={isLoading}
              className="text-xs font-semibold px-3 py-1.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 hover:border-sky-300 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{suggestion}</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-sky-600" />
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CHAT CONVERSATION CONTAINER */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[440px] max-h-[640px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2 ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="text-xs sm:text-sm font-medium leading-relaxed">
                      {message.content}
                    </p>
                  ) : (
                    renderFormattedContent(message.content)
                  )}

                  {/* Message Meta */}
                  <div className={`flex items-center gap-2 pt-1 text-[10px] ${isUser ? 'text-slate-400 justify-end' : 'text-slate-400'}`}>
                    <span>{message.timestamp}</span>
                    {!isUser && message.source && (
                      <span className="capitalize text-slate-600">
                        • {message.source === 'gemini' ? 'Gemini 2.5' : 'Grounded Engine'}
                      </span>
                    )}
                  </div>

                  {/* Dynamic Follow-up Suggestions for Assistant */}
                  {!isUser && message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block w-full">
                        Follow-up:
                      </span>
                      {message.suggestedFollowUps.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSendMessage(q)}
                          disabled={isLoading}
                          className="text-[11px] font-medium px-2.5 py-1 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <span className="text-xs font-bold">You</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking / Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-2xs flex items-center space-x-2.5 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Consulting travel data & routes...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your route, stops, costs, or transport..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-tr from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 disabled:from-slate-200 disabled:to-slate-200 text-white disabled:text-slate-400 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-sky-600/15 disabled:shadow-none flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-600">
            <span>Grounded in active trip data · Enter to submit</span>
            <span>Security: Zero frontend API keys</span>
          </div>
        </div>
      </div>
    </div>
  );
};
