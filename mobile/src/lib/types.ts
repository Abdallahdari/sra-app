export type ContentType =
  | 'insight'
  | 'story'
  | 'research'
  | 'project'
  | 'event'
  | 'episode'
  | 'video'
  | 'researcher'
  | 'fuel'
  | 'service'
  | 'partner';

export type Item = {
  _id: string;
  type: ContentType;
  title: string;
  slug: string;
  summary?: string;
  body?: string;
  image?: string;
  gallery?: string[];
  date?: string;
  category?: string;
  link?: string;
  videoUrl?: string;
  meta?: Record<string, any>;
  featured?: boolean;
  published?: boolean;
  order?: number;
  updatedAt?: string;
  source?: 'wp' | 'admin';
};

export type Page<T> = { items: T[]; total: number; page: number; pages?: number; hasMore: boolean };

export type Settings = {
  hero?: { title?: string; subtitle?: string; image?: string };
  stats?: { value: string; label: string }[];
  regions?: string[];
  contact?: { address?: string; phones?: string[]; email?: string; website?: string };
  social?: { facebook?: string; x?: string; linkedin?: string; youtube?: string };
  about?: string;
  announcement?: string;
};

export type Home = {
  settings: Settings;
  stories: Item[];
  insights: Item[];
  projects: Item[];
  events: Item[];
  episodes: Item[];
  videos: Item[];
  research: Item[];
  partners: Item[];
  services: Item[];
  fuel: Item[];
};

export type FieldKind = 'text' | 'textarea' | 'markdown' | 'image' | 'gallery' | 'date' | 'select' | 'bool' | 'number' | 'url' | 'list';
export type FieldDef = { key: string; label: string; kind: FieldKind; required?: boolean; options?: string[]; help?: string };
export type TypeDef = {
  type: ContentType;
  label: string;
  singular: string;
  icon: string;
  description: string;
  categories: string[];
  fields: FieldDef[];
};

export type AdminUser = { id: string; email: string; name: string; role: 'admin' | 'editor' };
