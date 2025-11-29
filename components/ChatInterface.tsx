import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MoreVertical, Sparkles, RefreshCw, Copy, Edit2, Trash2, Mic, Image as ImageIcon, X, AlertCircle, Upload } from 'lucide-react';
import { Character, Message, Attachment } from '../types';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';
import { Chat } from '@google/genai';

interface ChatInterfaceProps {
  character: Character;
  onBack: () => void;
  initialMessages: Message[];
  onUpdateHistory: (messages: Message[]) => void;
  onUpdateCharacter: (character: Character) => void;
}

// Typewriter Effect Component
const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    // Speed: 10-30ms random delay for realism
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 15); // Base speed
    return () => clearInterval(interval);
  }, [text]);

  return <>{displayedText}</>;
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ character, onBack, initialMessages, onUpdateHistory, onUpdateCharacter }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Initialize Chat & History
  useEffect(() => {
    const session = createChatSession(character.systemInstruction);
    setChatSession(session);
    
    // If no history, add greeting
    if (messages.length === 0) {
        const initialGreeting: Message = {
            id: 'init',
            role: 'model',
            text: `*${character.name} замечает вас.* ${character.tagline}`,
            timestamp: new Date(),
        };
        const newMsgs = [initialGreeting];
        setMessages(newMsgs);
        onUpdateHistory(newMsgs);
    }
  }, [character.id]);

  useEffect(() => {
      onUpdateHistory(messages);
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Voice Input Logic ---
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Ваш браузер не поддерживает голосовой ввод.");
        return;
    }

    if (isListening) {
        setIsListening(false);
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  };

  // --- Image Handling ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAttachment({ type: 'image', url: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  // --- Wallpaper Handling ---
  const handleWallpaperSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              onUpdateCharacter({ ...character, wallpaper: result });
              setShowMenu(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || !chatSession || isLoading) return;

    if (editingMessageId) {
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, text: input, isEdited: true } : m));
        setEditingMessageId(null);
        setInput('');
        return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
      attachment: attachment ? { ...attachment } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const msgToSend = userMsg.attachment 
         ? `[Пользователь отправил изображение] ${userMsg.text}` 
         : userMsg.text;

      const responseText = await sendMessageToGemini(chatSession, msgToSend);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: "*[Критическая ошибка связи. Попробуйте еще раз.]*",
          timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!chatSession || messages.length < 2) return;
    
    setIsLoading(true);
    // Remove last bot message
    const lastUserMessage = messages[messages.length - 2];
    setMessages(prev => prev.slice(0, -1));

    try {
        const responseText = await sendMessageToGemini(chatSession, lastUserMessage.text + " (Попробуй еще раз, по-другому)");
        
        const botMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleEdit = (msg: Message) => {
    setInput(msg.text);
    setEditingMessageId(msg.id);
  };

  const handleClearChat = () => {
      if(window.confirm("Удалить всю историю переписки с этим персонажем?")) {
        // Clear local state
        setMessages([]);
        // Reset session
        const session = createChatSession(character.systemInstruction);
        setChatSession(session);
        // Create new greeting
        const initialGreeting: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: `*${character.name} снова смотрит на вас, как будто видит впервые.*`,
            timestamp: new Date(),
        };
        const newMsgs = [initialGreeting];
        setMessages(newMsgs);
        // FORCE UPDATE DATABASE
        onUpdateHistory(newMsgs);
        setShowMenu(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isErrorMessage = (text: string) => text.startsWith("*[") && text.includes("Ошибка");

  return (
    <div className="flex flex-col h-[100dvh] bg-background fixed inset-0 z-50">
      
      {/* Dynamic Wallpaper Background */}
      {character.wallpaper && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${character.wallpaper})` }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background/80 backdrop-blur-xl z-10 relative">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
                <img 
                src={character.avatarUrl} 
                alt={character.name} 
                className="w-10 h-10 rounded-full object-cover border border-white/10 ring-2 ring-transparent group-hover:ring-primary/50 transition-all"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse-slow"></span>
            </div>
            <div>
              <h2 className="text-white font-bold text-sm tracking-wide">{character.name}</h2>
              <div className="flex items-center gap-2">
                 {character.isPublic ? <span className="text-green-400 text-[10px] uppercase tracking-wider font-bold">online</span> : <span className="text-yellow-500 text-[10px] uppercase tracking-wider font-bold">private</span>}
                 {messages.length > 2 && <span className="text-gray-500 text-[10px]">• {messages.length} msg</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-white/10 rounded-full text-secondary hover:text-white transition-colors">
            <MoreVertical size={20} />
            </button>
            {showMenu && (
                <div className="absolute right-0 top-10 w-56 bg-surfaceHighlight/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-fade-in ring-1 ring-white/5">
                    <button onClick={handleClearChat} className="w-full text-left px-4 py-3 hover:bg-white/5 text-red-400 flex items-center gap-3 text-sm transition-colors">
                        <Trash2 size={16} /> Очистить чат
                    </button>
                     <button onClick={() => wallpaperInputRef.current?.click()} className="w-full text-left px-4 py-3 hover:bg-white/5 text-white flex items-center gap-3 text-sm transition-colors border-t border-white/5">
                        <Upload size={16} /> Изменить обои
                    </button>
                    <input type="file" ref={wallpaperInputRef} className="hidden" accept="image/*" onChange={handleWallpaperSelect} />
                </div>
            )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar relative z-10">
        <div className="text-center py-6 opacity-80 animate-fade-in-up">
             <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-3 border-4 border-surfaceHighlight/50 shadow-2xl relative group">
                <img src={character.avatarUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
             </div>
             <h3 className="text-xl font-bold mb-1 text-white shadow-black drop-shadow-md">{character.name}</h3>
             <p className="text-secondary/80 text-xs font-mono bg-black/30 backdrop-blur-sm inline-block px-2 py-1 rounded border border-white/5">@{character.creator}</p>
             <p className="text-gray-300 text-sm mt-2 max-w-xs mx-auto italic drop-shadow-md">{character.tagline}</p>
        </div>
        
        {messages.map((msg, idx) => {
          const isError = isErrorMessage(msg.text);
          const useTypewriter = msg.role === 'model' && idx === messages.length - 1 && Date.now() - msg.timestamp.getTime() < 5000;

          return (
            <div 
              key={msg.id} 
              className={`group flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            >
              {msg.role === 'model' && (
                  <img src={character.avatarUrl} className="w-8 h-8 rounded-full object-cover mr-2 self-end mb-4 border border-white/10 shadow-lg" />
              )}
              
              <div className="flex flex-col max-w-[85%] md:max-w-[70%]">
                  <div className={`
                  relative px-5 py-3 text-[15px] leading-relaxed shadow-lg backdrop-blur-sm
                  ${msg.role === 'user' 
                      ? 'bg-primary/90 text-white rounded-2xl rounded-br-sm border border-primary/20' 
                      : isError 
                        ? 'bg-red-900/60 border border-red-500/50 text-red-200 rounded-2xl rounded-bl-sm'
                        : 'bg-surfaceHighlight/80 text-gray-100 rounded-2xl rounded-bl-sm border border-white/5'}
                  `}>
                  {isError && <AlertCircle size={16} className="inline mr-2 mb-0.5" />}
                  
                  {/* Attachment Display */}
                  {msg.attachment && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-white/10 shadow-md">
                          <img src={msg.attachment.url} alt="attachment" className="max-w-full h-auto" />
                      </div>
                  )}

                  {/* Text Content */}
                  <span className="whitespace-pre-wrap">
                     {useTypewriter && !isLoading ? <TypewriterText text={msg.text} onComplete={scrollToBottom}/> : msg.text}
                  </span>
                  
                  {msg.isEdited && <span className="text-[10px] opacity-50 block text-right mt-1 font-mono tracking-tighter">(edited)</span>}
                  </div>

                  {/* Message Actions */}
                  <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <button onClick={() => handleCopy(msg.text)} className="p-1.5 hover:bg-black/30 rounded-full text-gray-400 hover:text-white transition-colors" title="Копировать">
                          <Copy size={12} />
                      </button>
                      {msg.role === 'user' && (
                          <button onClick={() => handleEdit(msg)} className="p-1.5 hover:bg-black/30 rounded-full text-gray-400 hover:text-white transition-colors" title="Редактировать">
                              <Edit2 size={12} />
                          </button>
                      )}
                      {msg.role === 'model' && idx === messages.length - 1 && (
                          <button onClick={handleRegenerate} className="p-1.5 hover:bg-black/30 rounded-full text-gray-400 hover:text-white transition-colors" title="Перегенерировать">
                              <RefreshCw size={12} />
                          </button>
                      )}
                  </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
             <img src={character.avatarUrl} className="w-8 h-8 rounded-full object-cover mr-2 self-end mb-1 border border-white/10 opacity-70" />
            <div className="bg-surfaceHighlight/80 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 border border-white/5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4"/>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-background/90 border-t border-white/5 backdrop-blur-xl pb-safe relative z-20">
        {editingMessageId && (
            <div className="flex justify-between items-center px-4 py-2 bg-primary/10 border border-primary/20 text-xs text-primary mb-2 rounded-lg animate-fade-in">
                <span>Редактирование...</span>
                <button onClick={() => { setEditingMessageId(null); setInput(''); }}><X size={14}/></button>
            </div>
        )}
        {attachment && (
            <div className="flex items-center px-4 py-2 bg-surfaceHighlight/50 border border-white/10 text-xs text-green-400 mb-2 rounded-lg gap-2 animate-fade-in">
                <ImageIcon size={14}/> <span>Изображение прикреплено</span>
                <button onClick={() => setAttachment(null)} className="ml-auto text-gray-400 hover:text-white"><X size={14}/></button>
            </div>
        )}
        <div className="flex items-end gap-2 bg-surfaceHighlight/50 rounded-[26px] p-1.5 border border-white/10 focus-within:border-primary/50 focus-within:bg-surfaceHighlight focus-within:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all duration-300 shadow-inner">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
             <ImageIcon size={20} />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Сообщение...`}
            className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none outline-none py-3 px-2 max-h-32 text-sm no-scrollbar"
            rows={1}
            style={{ minHeight: '46px' }}
          />
           <button 
                onClick={handleVoiceInput}
                className={`p-2.5 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
           >
             <Mic size={20} />
          </button>
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !attachment) || isLoading}
            className={`p-2.5 rounded-full mb-0.5 transition-all duration-300 ${
              (input.trim() || attachment)
                ? 'bg-primary text-white hover:scale-110 shadow-lg shadow-primary/30 active:scale-95' 
                : 'bg-white/5 text-gray-600'
            }`}
          >
            {editingMessageId ? <Sparkles size={20} /> : <Send size={20} className={(input.trim() || attachment) ? 'ml-0.5' : ''} />}
          </button>
        </div>
      </div>
    </div>
  );
};