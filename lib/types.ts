export interface Section {
  id: number;
  title: string;
  startPage: number;
  endPage: number;
  summary: string;
  thinkingPrompts: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SessionStoragePayload {
  sections: Section[];
  fileName: string;
  totalPages: number;
}

export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}
