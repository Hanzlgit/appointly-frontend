export type TenantRole = "tenant_admin" | "staff";

export interface StaffBooking {
  id: number;
  status: string;
  party_size: number;
  contact_name: string;
  contact_phone: string;
  customer_phone?: string;
  customer_id: number;
  service_id: number;
  resource_id: number;
  location_id: number;
  time_slot_id: number;
  start: string;
  end: string;
  rescheduled_from_id: number | null;
  rescheduled_to_id: number | null;
  created_at: string;
}

export interface StaffBookingList {
  bookings: StaffBooking[];
}

export interface TenantMembership {
  role: TenantRole;
}

export interface DashboardStatusSummary {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DashboardTrendPoint {
  date: string;
  count: number;
}

export interface DashboardLocationCount {
  location_id: number;
  location_name: string;
  count: number;
}

export interface DashboardResourceUtilization {
  resource_id: number;
  resource_name: string;
  booked_minutes: number;
  available_minutes: number;
  utilization_rate: number;
}

export interface DashboardPopularService {
  service_id: number;
  service_name: string;
  count: number;
}

export interface DashboardSummary {
  reference_date: string;
  today_summary: DashboardStatusSummary;
  seven_day_trend: DashboardTrendPoint[];
  bookings_by_location: DashboardLocationCount[];
  resource_utilization: DashboardResourceUtilization[];
  popular_services: DashboardPopularService[];
}

export interface CatalogLocation {
  id: number;
  name: string;
  address: string;
  is_active: boolean;
  resource_count: number;
  service_count: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogService {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  location_id: number;
  resource_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface CatalogResource {
  id: number;
  name: string;
  location_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogLocationList {
  locations: CatalogLocation[];
}

export interface CatalogServiceList {
  services: CatalogService[];
}

export interface CatalogResourceList {
  resources: CatalogResource[];
}

export interface BookingSettings {
  min_advance_minutes: number;
  max_booking_window_days: number;
  pending_retention_minutes: number;
  cancel_deadline_minutes: number;
  future_booking_limit: number;
  confirmation_mode: "auto" | "manual";
  updated_at: string;
}

export interface ScheduleRule {
  id: number;
  location_id: number;
  resource_id: number;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleRuleList {
  rules: ScheduleRule[];
}

export interface ScheduleRuleCreatePayload {
  location_id: number;
  resource_id: number;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  slot_interval_minutes: 15 | 30 | 45 | 60;
  capacity: number;
}

export interface ScheduleRuleUpdatePayload {
  effective_date: string;
  days_of_week?: number[];
  start_time?: string;
  end_time?: string;
  slot_interval_minutes?: 15 | 30 | 45 | 60;
  capacity?: number;
  is_active?: boolean;
}
