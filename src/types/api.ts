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

export interface TenantContext {
  slug: string;
  name: string;
  timezone: string;
  is_active: boolean;
}

export interface CatalogPublicLocation {
  id: number;
  name: string;
  address: string;
}

export interface CatalogPublicService {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  location_id: number;
}

export interface CatalogPublicBrowse {
  locations: CatalogPublicLocation[];
  services: CatalogPublicService[];
}

export interface AvailabilitySlot {
  time_slot_id: number;
  resource_id: number;
  location_id: number;
  start: string;
  end: string;
  capacity: number;
  remaining_capacity: number;
}

export interface AvailabilityAggregateItem {
  service_id: number;
  location_id: number;
  start: string;
  end: string;
  remaining_capacity: number;
}

export type AvailabilityResult =
  | { mode: "resource"; slots: AvailabilitySlot[] }
  | { mode: "aggregate"; availability: AvailabilityAggregateItem[] };

export interface Booking {
  id: number;
  status: string;
  party_size: number;
  contact_name: string;
  contact_phone: string;
  service_id: number;
  service_name: string;
  resource_id: number;
  resource_name: string;
  resource_is_active: boolean;
  location_id: number;
  location_name: string;
  location_address: string;
  location_is_active: boolean;
  time_slot_id: number;
  start: string;
  end: string;
  rescheduled_from_id: number | null;
  rescheduled_to_id: number | null;
  created_at: string;
}

export interface BookingList {
  bookings: Booking[];
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  body: string;
  booking_id: number | null;
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

export interface CustomerProfile {
  tenant_slug: string;
  phone: string;
  display_name: string;
  notes: string;
  tags: unknown;
}

export interface ApiError extends Error {
  status: number;
  code: number;
  data: unknown;
}
