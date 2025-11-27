export interface DocRecord {
  id: string;
  title: string;
  content: string; // The text content
  fulltext: string; // Full text content for search
  mediaBlob?: Blob; // Optional associated media (image/video/audio)
  mediaType?: string; // MIME type of the media
  createdAt: number;
  tags: string[];
}

export type ViewState = 'DASHBOARD' | 'UPLOAD' | 'VIEWER' | 'BROWSE';

export interface FileGroup {
  baseName: string;
  text?: File;
  media?: File;
}

export interface SearchFilters {
  query: string;
  hasMedia: boolean;
  dateRange: 'all' | 'today' | 'week' | 'month';
}