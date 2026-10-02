/**
 * Standard API Response Interfaces and Generic Wrappers
 */

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: string;
}

export interface ApiError {
  message: string;
  status?: number;
  detail?: string | Array<{ msg: string; loc: (string | number)[] }>;
}

export interface RootApiResponse {
  message: string;
  version: string;
  status: string;
}

export interface HealthApiResponse {
  status: string;
  service: string;
  environment: string;
}

export interface ApiHealthDetailedResponse {
  status: string;
  service: string;
  environment: string;
  version: string;
  database: {
    status: string;
    engine: string;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
