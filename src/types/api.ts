/** 后端统一 API 响应信封。 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  request_id: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface CatalogPublicLocation {
  id: number;
  name: string;
  address: string;
}

export interface CatalogPublicStylist {
  id: number;
  name: string;
  ticket_prefix: string;
  queue_status: string;
}

export interface CatalogPublicService {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  stylist_id: number;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type PaginatedLocationList = PaginatedList<CatalogPublicLocation>;
export type PaginatedStylistList = PaginatedList<CatalogPublicStylist>;
export type PaginatedServiceList = PaginatedList<CatalogPublicService>;

export interface QueueTicket {
  id: number;
  ticket_display: string;
  ticket_number: number;
  status: string;
  position: number;
  ahead_count: number;
  estimated_wait_minutes: number;
  location_id: number;
  location_name: string;
  stylist_id: number;
  stylist_name: string;
  service_id: number;
  service_name: string;
  service_duration_minutes: number;
  service_price_cents: number;
  queue_date: string;
  created_at: string;
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  body: string;
  queue_ticket_id: number | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResult {
  items: Notification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface NotificationReadAllResult {
  marked_count: number;
}

export interface ApiError extends Error {
  status: number;
  code: number;
  data: unknown;
}
