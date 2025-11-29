import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, Sparkles, Globe, Lock, Save, Image as ImageIcon } from 'lucide-react';
import { Character } from '../types';

interface CreateCharacterProps {
  onBack: () => void;
  onSave: (character: Character) => void;
  initialData?: Character | null; // Для режима редактирования
}

export const CreateCharacter: React.FC<CreateCharacterProps> = ({ onBack, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [tagline, setTagline] = useState(initialData?.tagline || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [systemInstruction, setSystemInstruction] = useState(initialData?.systemInstruction || '');
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Если нет аватара, генерируем дефолтный при вводе имени
  useEffect(() => {
    if (!avatarUrl && name && !initialData) {
        setAvatarUrl(`https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&size=400&bold=true`);
    }
  }, [name, avatarUrl, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name || !tagline) return;

    const newCharacter: Character = {
      id: initialData?.id || Date.now().toString(),
      name,
      tagline,
      description: description || tagline,
      systemInstruction: systemInstruction || `Ты ${name}. ${description}. Веди себя естественно.`,
      avatarUrl: avatarUrl,
      creator: initialData?.creator || '@user',
      chatCount: initialData?.chatCount || '0',
      isPublic,
      isAuthor: true,
      likes: initialData?.likes || 0
    };

    onSave(newCharacter);
  };

  return (
    <div className="min-h-screen bg-background text-white pb-20 animate-fade-in">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">{initialData ? 'Редактировать' : 'Создать'}</h1>
        </div>
        <button 
            onClick={handleSave}
            disabled={!name || !tagline}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${
                name && tagline 
                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-blue-600' 
                : 'bg-surfaceHighlight text-gray-500 cursor-not-allowed'
            }`}
        >
            <Save size={16} />
            Сохранить
        </button>
      </header>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        
        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-6">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 rounded-full bg-surfaceHighlight border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary transition-all group overflow-hidden shadow-2xl"
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <Camera className="text-gray-400 group-hover:text-primary w-8 h-8" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="text-white w-8 h-8" />
                </div>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
            />
            <span className="text-xs text-gray-500 mt-2">Нажмите, чтобы загрузить фото</span>
        </div>

        {/* Public/Private Toggle */}
        <div className="bg-surface rounded-xl p-1 flex items-center relative cursor-pointer border border-white/10" onClick={() => setIsPublic(!isPublic)}>
            <div className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-all z-10 ${!isPublic ? 'text-white' : 'text-gray-400'}`}>
                <div className="flex items-center justify-center gap-2">
                    <Lock size={14} /> Приватно
                </div>
            </div>
            <div className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-all z-10 ${isPublic ? 'text-white' : 'text-gray-400'}`}>
                <div className="flex items-center justify-center gap-2">
                    <Globe size={14} /> Публично
                </div>
            </div>
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surfaceHighlight rounded-lg transition-all duration-300 shadow-sm ${isPublic ? 'left-[50%]' : 'left-1'}`}></div>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Имя персонажа</label>
            <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Илон Маск"
                className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors"
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Заголовок (Tagline)</label>
            <input 
                type="text" 
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Короткая фраза в ленте..."
                className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors"
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Описание</label>
            <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Расскажи больше о персонаже..."
                className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors min-h-[100px]"
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Sparkles size={14} className="text-primary"/> 
                Системная инструкция (Личность AI)
            </label>
            <textarea 
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder="Опиши характер, манеру речи, секреты и прошлое персонажа. Чем подробнее, тем лучше."
                className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors min-h-[150px] font-mono text-sm"
            />
        </div>
      </div>
    </div>
  );
};