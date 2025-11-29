import React from 'react';
import { Character } from '../types';
import { MessageCircle } from 'lucide-react';

interface CharacterCardProps {
  character: Character;
  onClick: (character: Character) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, onClick }) => {
  return (
    <div 
      onClick={() => onClick(character)}
      className="group bg-surface hover:bg-surfaceHighlight transition-colors duration-200 rounded-2xl cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Image container with aspect ratio */}
      <div className="w-full aspect-[4/3] overflow-hidden relative">
        <img 
          src={character.avatarUrl} 
          alt={character.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute bottom-2 left-3 text-white">
           <span className="text-xs font-medium bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
            {character.creator}
           </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="text-white font-bold text-lg leading-tight mb-1">{character.name}</h3>
        <p className="text-secondary text-sm line-clamp-2 mb-3 flex-grow">{character.tagline}</p>
        
        <div className="flex items-center text-gray-500 text-xs mt-auto">
          <MessageCircle size={14} className="mr-1" />
          <span>{character.chatCount}</span>
        </div>
      </div>
    </div>
  );
};