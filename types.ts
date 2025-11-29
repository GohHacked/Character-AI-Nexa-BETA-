export interface User {
  id: string;
  email: string;
  username: string;
  password: string; // В реальном приложении это должен быть хеш
  avatar: string;
  createdAt: string;
}

export interface Character {
  id: string;
  name: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  creator: string; // Username создателя
  creatorId?: string; // ID создателя для привязки
  chatCount: string;
  systemInstruction: string;
  isPublic: boolean;
  isAuthor: boolean; // Вычисляемое поле (не хранится в БД, зависит от текущего юзера)
  likes: number;
  lastActive?: number;
  wallpaper?: string;
}

export interface Attachment {
  type: 'image';
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isEdited?: boolean;
  attachment?: Attachment;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'update' | 'news' | 'system';
}

export enum ViewState {
  AUTH = 'AUTH',
  HOME = 'HOME',
  CHAT = 'CHAT',
  CREATE = 'CREATE',
  PROFILE = 'PROFILE',
  EDIT = 'EDIT'
}

// Интерфейс для хранения всей базы данных
export interface AppDatabase {
  users: User[]; // Список всех зарегистрированных пользователей
  characters: Character[]; // Все персонажи
  // Ключ теперь сложный: userId_characterId, чтобы история была уникальной для юзера
  chatHistories: Record<string, Message[]>; 
  notifications?: Notification[];
}