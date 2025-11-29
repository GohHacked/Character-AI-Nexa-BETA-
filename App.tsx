import React, { useState, useEffect } from 'react';
import { Search, Bell, Home, PlusCircle, User as UserIcon, Settings, LogOut, Trash2, Edit, Globe, Lock, MessageCircle, X, Info } from 'lucide-react';
import { Character, ViewState, Message, AppDatabase, User, Notification } from './types';
import { CharacterCard } from './components/CharacterCard';
import { ChatInterface } from './components/ChatInterface';
import { CreateCharacter } from './components/CreateCharacter';
import { AuthScreen } from './components/AuthScreen';
import { CATEGORIES, CHARACTERS as INITIAL_CHARACTERS, NOTIFICATIONS as INITIAL_NOTIFICATIONS } from './constants';

// --- DATABASE SERVICE (LOCAL STORAGE) ---
const DB_KEY = 'character_ai_nexa_db_v3';
const SESSION_KEY = 'character_ai_nexa_session_v3';

const loadDatabase = (): AppDatabase => {
  try {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Restore dates
      const histories = parsed.chatHistories || {};
      Object.keys(histories).forEach(key => {
        histories[key] = histories[key].map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      });
      
      // Ensure users array exists
      if (!parsed.users) parsed.users = [];

      return {
        users: parsed.users,
        characters: parsed.characters || INITIAL_CHARACTERS,
        chatHistories: histories,
        notifications: parsed.notifications || INITIAL_NOTIFICATIONS
      };
    }
  } catch (e) {
    console.error("Database load error:", e);
  }
  return {
    users: [],
    characters: INITIAL_CHARACTERS,
    chatHistories: {},
    notifications: INITIAL_NOTIFICATIONS
  };
};

export default function App() {
  // Global State
  const [db, setDb] = useState<AppDatabase>(loadDatabase);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('Для вас');
  const [viewState, setViewState] = useState<ViewState>(ViewState.AUTH);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileTab, setProfileTab] = useState<'public' | 'private'>('public');
  const [showNotifications, setShowNotifications] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- INITIALIZATION ---
  useEffect(() => {
    // Check for active session
    const savedSessionId = localStorage.getItem(SESSION_KEY);
    if (savedSessionId) {
      const user = db.users.find(u => u.id === savedSessionId);
      if (user) {
        setCurrentUser(user);
        setViewState(ViewState.HOME);
      } else {
        localStorage.removeItem(SESSION_KEY);
        setViewState(ViewState.AUTH);
      }
    } else {
      setViewState(ViewState.AUTH);
    }
  }, []);

  // Save DB changes
  useEffect(() => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }, [db]);

  // --- AUTH HANDLERS ---
  const handleLogin = (email: string, pass: string) => {
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, user.id);
      setViewState(ViewState.HOME);
      setAuthError('');
    } else {
      setAuthError('Неверный email или пароль');
    }
  };

  const handleRegister = (email: string, username: string, pass: string) => {
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setAuthError('Этот email уже зарегистрирован');
      return;
    }
    
    const newUser: User = {
      id: Date.now().toString(),
      email,
      username,
      password: pass,
      avatar: `https://ui-avatars.com/api/?name=${username.replace(' ', '+')}&background=random&size=400&bold=true`,
      createdAt: new Date().toISOString()
    };

    setDb(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));

    setCurrentUser(newUser);
    localStorage.setItem(SESSION_KEY, newUser.id);
    setViewState(ViewState.HOME);
    setAuthError('');
  };

  const handleLogout = () => {
    if (window.confirm("Вы уверены, что хотите выйти из аккаунта?")) {
      setCurrentUser(null);
      localStorage.removeItem(SESSION_KEY);
      setViewState(ViewState.AUTH);
      setSelectedCharacter(null);
    }
  };

  // --- DATA COMPUTATION (User Specific) ---
  
  // Enrich characters with "isAuthor" based on currentUser
  const enrichedCharacters = db.characters.map(c => ({
    ...c,
    isAuthor: currentUser ? (c.creatorId === currentUser.id || c.creator === currentUser.username) : false
  }));

  // Filter for Feed: Public characters OR Private characters owned by me
  const feedCharacters = enrichedCharacters
    .filter(c => 
      (c.isPublic || c.isAuthor) &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       c.tagline.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

  const myCharacters = enrichedCharacters.filter(c => c.isAuthor);

  // --- APP LOGIC ---

  const handleCharacterClick = (char: Character) => {
    setSelectedCharacter(char);
    setViewState(ViewState.CHAT);
  };

  const handleBackFromChat = () => {
    setViewState(ViewState.HOME);
    setSelectedCharacter(null);
  };

  const handleUpdateChatHistory = (charId: string, messages: Message[]) => {
    if (!currentUser) return;
    
    // Key is userId_characterId to separate chats for different users
    const historyKey = `${currentUser.id}_${charId}`;

    setDb(prev => {
        const updatedChars = prev.characters.map(c => 
            c.id === charId ? { ...c, lastActive: Date.now() } : c
        );
        return {
            ...prev,
            characters: updatedChars,
            chatHistories: {
                ...prev.chatHistories,
                [historyKey]: messages
            }
        };
    });
  };

  const handleUpdateCharacter = (updatedChar: Character) => {
      setDb(prev => ({
          ...prev,
          characters: prev.characters.map(c => c.id === updatedChar.id ? updatedChar : c)
      }));
      if (selectedCharacter && selectedCharacter.id === updatedChar.id) {
          setSelectedCharacter(updatedChar);
      }
  };

  const handleCreateSave = (newChar: Character) => {
    if (!currentUser) return;

    // Attach current user as creator
    const charWithCreator: Character = {
      ...newChar,
      creator: currentUser.username,
      creatorId: currentUser.id,
      isAuthor: true // Locally true immediately
    };

    setDb(prev => {
        let updatedChars;
        if (prev.characters.find(c => c.id === newChar.id)) {
            updatedChars = prev.characters.map(c => c.id === newChar.id ? charWithCreator : c);
        } else {
            updatedChars = [charWithCreator, ...prev.characters];
        }
        return { ...prev, characters: updatedChars };
    });
    setViewState(ViewState.PROFILE);
  };

  const handleDeleteCharacter = (id: string) => {
      if (!currentUser) return;
      if (window.confirm("Вы уверены, что хотите удалить этого персонажа навсегда?")) {
          setDb(prev => {
              const newHistories = { ...prev.chatHistories };
              // Delete history for this character for this user
              delete newHistories[`${currentUser.id}_${id}`];
              
              return {
                  ...prev,
                  characters: prev.characters.filter(c => c.id !== id),
                  chatHistories: newHistories
              };
          });
      }
  };

  const handleEditCharacter = (char: Character) => {
      setSelectedCharacter(char);
      setViewState(ViewState.EDIT);
  };

  const togglePublishStatus = (id: string) => {
      setDb(prev => ({
          ...prev,
          characters: prev.characters.map(c => c.id === id ? { ...c, isPublic: !c.isPublic } : c)
      }));
  };

  const markAllNotificationsRead = () => {
      setDb(prev => ({
          ...prev,
          notifications: prev.notifications?.map(n => ({ ...n, isRead: true }))
      }));
  };

  const unreadCount = db.notifications?.filter(n => !n.isRead).length || 0;


  // --- RENDERING ---

  if (viewState === ViewState.AUTH || !currentUser) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} />;
  }

  if (viewState === ViewState.CHAT && selectedCharacter) {
    // Get specific history for this user
    const historyKey = `${currentUser.id}_${selectedCharacter.id}`;
    const history = db.chatHistories[historyKey] || [];
    
    return (
        <ChatInterface 
            character={selectedCharacter} 
            initialMessages={history}
            onUpdateHistory={(msgs) => handleUpdateChatHistory(selectedCharacter.id, msgs)}
            onUpdateCharacter={handleUpdateCharacter}
            onBack={handleBackFromChat} 
        />
    );
  }

  if (viewState === ViewState.CREATE) {
    return <CreateCharacter onBack={() => setViewState(ViewState.HOME)} onSave={handleCreateSave} />;
  }

  if (viewState === ViewState.EDIT && selectedCharacter) {
      return <CreateCharacter onBack={() => setViewState(ViewState.PROFILE)} onSave={handleCreateSave} initialData={selectedCharacter} />;
  }

  return (
    <div className="min-h-screen pb-24 bg-background text-white font-sans selection:bg-primary/30">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setViewState(ViewState.HOME)}>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-white bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                Character AI Nexa
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Search className="text-gray-400 w-6 h-6 cursor-pointer hover:text-white transition-colors" />
            <div className="relative" onClick={() => { setShowNotifications(true); markAllNotificationsRead(); }}>
                <Bell className={`w-6 h-6 cursor-pointer transition-colors ${unreadCount > 0 ? 'text-white' : 'text-gray-400 hover:text-white'}`} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-background animate-pulse"></span>}
            </div>
            <div 
                onClick={() => setViewState(ViewState.PROFILE)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent p-[1px] cursor-pointer hover:scale-105 transition-transform"
            >
               <img src={currentUser.avatar} alt="Profile" className="rounded-full bg-black" />
            </div>
          </div>
        </div>

        {/* Categories (Only on HOME) */}
        {viewState === ViewState.HOME && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar mask-gradient-right">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                  activeTab === cat
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-105'
                    : 'bg-surfaceHighlight border-transparent text-gray-400 hover:bg-surfaceHighlight/80 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="px-4 py-4 animate-fade-in">
        
        {/* --- HOME VIEW --- */}
        {viewState === ViewState.HOME && (
            <>
                <div className="mb-6 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Найти персонажа..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-2xl leading-5 bg-surface text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-surfaceHighlight focus:ring-1 focus:ring-primary/50 transition-all shadow-sm hover:bg-surfaceHighlight/50"
                    />
                </div>

                <h2 className="text-lg font-bold mb-4 text-gray-200 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full"></span>
                    Рекомендуемые
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {feedCharacters.map((char) => (
                    <CharacterCard 
                        key={char.id} 
                        character={char} 
                        onClick={handleCharacterClick} 
                    />
                ))}
                </div>
            </>
        )}

        {/* --- PROFILE VIEW --- */}
        {viewState === ViewState.PROFILE && (
            <div className="flex flex-col items-center pt-4">
                {/* Profile Header */}
                <div className="w-full bg-surface rounded-3xl p-6 mb-6 text-center border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-accent p-1 mx-auto mb-3 shadow-xl">
                            <img src={currentUser.avatar} alt="Profile" className="rounded-full bg-black w-full h-full" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{currentUser.username}</h2>
                        <p className="text-gray-400 text-sm mb-4 font-mono">{currentUser.email}</p>
                        
                        <div className="flex justify-center gap-8 text-sm bg-black/20 rounded-xl py-3 max-w-xs mx-auto backdrop-blur-sm border border-white/5">
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-white text-lg">{myCharacters.length}</span>
                                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Персонажи</span>
                            </div>
                            <div className="w-px bg-white/10 h-8"></div>
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-white text-lg">{myCharacters.reduce((acc, curr) => acc + (curr.likes || 0), 0)}</span>
                                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Лайки</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* My Characters Tabs */}
                <div className="w-full mb-4 flex border-b border-white/10">
                     <button 
                        onClick={() => setProfileTab('public')}
                        className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${profileTab === 'public' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                        Публичные
                        {profileTab === 'public' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.5)]"></span>}
                     </button>
                     <button 
                        onClick={() => setProfileTab('private')}
                        className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${profileTab === 'private' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                        Приватные
                        {profileTab === 'private' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.5)]"></span>}
                     </button>
                </div>

                {/* Characters List */}
                <div className="w-full space-y-3">
                    {myCharacters.filter(c => profileTab === 'public' ? c.isPublic : !c.isPublic).length === 0 && (
                        <div className="text-center py-12 text-gray-500 bg-surface/50 rounded-2xl border border-white/5 border-dashed">
                            <p className="mb-2">Здесь пока пусто.</p>
                            <button onClick={() => setViewState(ViewState.CREATE)} className="text-primary mt-2 text-sm hover:underline flex items-center gap-1 mx-auto">
                                <PlusCircle size={16}/> Создать персонажа
                            </button>
                        </div>
                    )}

                    {myCharacters.filter(c => profileTab === 'public' ? c.isPublic : !c.isPublic).map(char => (
                        <div key={char.id} className="bg-surface border border-white/5 p-3 rounded-xl flex items-center gap-3 group hover:border-primary/30 transition-all hover:bg-surfaceHighlight">
                            <img src={char.avatarUrl} className="w-12 h-12 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">{char.name}</h3>
                                <p className="text-xs text-gray-400 truncate">{char.tagline}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleCharacterClick(char)} className="p-2 hover:bg-white/10 rounded-full text-blue-400 transition-colors" title="Чат">
                                    <MessageCircle size={18} />
                                </button>
                                <button onClick={() => togglePublishStatus(char.id)} className={`p-2 hover:bg-white/10 rounded-full transition-colors ${char.isPublic ? 'text-green-400' : 'text-yellow-400'}`} title={char.isPublic ? "Скрыть" : "Опубликовать"}>
                                    {char.isPublic ? <Globe size={18} /> : <Lock size={18} />}
                                </button>
                                <button onClick={() => handleEditCharacter(char)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors" title="Изменить">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => handleDeleteCharacter(char.id)} className="p-2 hover:bg-white/10 rounded-full text-red-400 hover:text-red-300 transition-colors" title="Удалить">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full max-w-md space-y-3 mt-8">
                    <button className="w-full flex items-center justify-between p-4 bg-surface rounded-xl hover:bg-surfaceHighlight transition-colors border border-white/5 hover:border-white/10">
                        <div className="flex items-center gap-3">
                            <Settings size={20} className="text-gray-400" />
                            <span>Настройки</span>
                        </div>
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors text-red-400 border border-red-500/20">
                        <div className="flex items-center gap-3">
                            <LogOut size={20} />
                            <span>Выйти</span>
                        </div>
                    </button>
                </div>
            </div>
        )}

      </main>

      {/* Notifications Modal */}
      {showNotifications && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => {
              if (e.target === e.currentTarget) setShowNotifications(false);
          }}>
              <div className="w-full sm:w-96 bg-surface border-t sm:border border-white/10 sm:rounded-2xl p-4 max-h-[80vh] overflow-y-auto animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                          <Bell size={20} className="text-primary"/> Уведомления
                      </h3>
                      <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-white/10 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="space-y-3">
                      {db.notifications?.map(n => (
                          <div key={n.id} className="bg-surfaceHighlight/50 p-3 rounded-xl border border-white/5 hover:bg-surfaceHighlight transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${n.type === 'update' ? 'bg-green-500/20 text-green-400' : n.type === 'news' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                      {n.type === 'update' ? 'Обновление' : n.type === 'news' ? 'Новости' : 'Система'}
                                  </span>
                                  <span className="text-xs text-gray-500">{n.date}</span>
                              </div>
                              <h4 className="font-bold text-sm mb-1">{n.title}</h4>
                              <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-background/80 backdrop-blur-xl border-t border-white/5 px-6 py-2 pb-5 flex justify-between items-end z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <NavItem 
            icon={<Home size={26} strokeWidth={viewState === ViewState.HOME ? 2.5 : 2} />} 
            label="Главная" 
            active={viewState === ViewState.HOME} 
            onClick={() => setViewState(ViewState.HOME)}
        />
        
        <div className="relative -top-6 group">
           <div className="absolute inset-0 bg-primary blur-2xl opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
           <button 
             onClick={() => setViewState(ViewState.CREATE)}
             className="relative bg-white text-black p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-300"
           >
             <PlusCircle size={32} />
           </button>
        </div>

        <NavItem 
            icon={<UserIcon size={26} strokeWidth={2} />} 
            label="Профиль" 
            active={viewState === ViewState.PROFILE} 
            onClick={() => setViewState(ViewState.PROFILE)}
        />
      </nav>
    </div>
  );
}

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 ${active ? 'text-white translate-y-[-2px]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
  >
    {icon}
    <span className={`text-[10px] font-medium tracking-wide ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);