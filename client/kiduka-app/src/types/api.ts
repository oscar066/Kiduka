// types/api.ts

export interface PaginatedResponse<T> {
  items?: T[];
  users?: T[];
  predictions?: T[];
  logs?: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}
