export type KpiStatus = 'not_started' | 'in_progress' | 'done' | 'blocked' | 'needs_review';
export type UserRoleType = 'admin' | 'editor' | 'viewer' | 'auditor';
export type PeriodType = 'monthly' | 'quarterly' | 'yearly';
export type PermissionType = 'read' | 'write' | 'admin';

export interface OrgSite {
  site_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Section {
  section_id: string;
  site_id: string;
  name: string;
  code: string;
  description?: string;
  order_idx: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  org_site?: OrgSite;
}

export interface Kpi {
  kpi_id: string;
  section_id: string;
  code: string;
  name: string;
  description?: string;
  owner_user_id?: string;
  target_formula?: string;
  unit?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  section?: Section;
  owner?: AppUser;
}

export interface KpiPeriod {
  period_id: string;
  period_type: PeriodType;
  start_date: string;
  end_date: string;
  label: string;
  year: number;
  quarter?: number;
  month?: number;
  is_active: boolean;
  created_at: string;
}

export interface KpiValue {
  value_id: string;
  kpi_id: string;
  period_id: string;
  numeric_value?: number;
  text_value?: string;
  status: KpiStatus;
  evidence_url?: string;
  evidence_metadata?: Record<string, any>;
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
  version: number;
  kpi?: Kpi;
  period?: KpiPeriod;
}

export interface GridCell {
  cell_id: string;
  sheet: string;
  row_idx: number;
  col_idx: number;
  kpi_id?: string;
  period_id?: string;
  raw_value?: string;
  display_value?: string;
  fmt_style_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  user_id: string;
  email: string;
  display_name?: string;
  department?: string;
  auth_user_id?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  role_id: string;
  name: UserRoleType;
  description?: string;
  permissions?: Record<string, any>;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  granted_by?: string;
  granted_at: string;
  role?: Role;
  user?: AppUser;
}

export interface EditSession {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  ip_address?: string;
  user_agent?: string;
  page_path?: string;
  is_active: boolean;
}

export interface ChangeSet {
  change_id: string;
  entity: string;
  entity_id: string;
  field: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  changed_by: string;
  changed_at: string;
  reason?: string;
  source_page?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  user?: AppUser;
}

export interface UserPresence {
  user_id: string;
  session_id: string;
  page_path?: string;
  cursor_position?: Record<string, any>;
  selected_cell?: Record<string, any>;
  last_seen: string;
  is_typing: boolean;
  user?: AppUser;
}

export interface CellLock {
  cell_id: string;
  user_id: string;
  session_id: string;
  locked_at: string;
  expires_at: string;
  user?: AppUser;
}

// Analytics types
export interface KpiAnalytics {
  total_kpis: number;
  completed_kpis: number;
  in_progress_kpis: number;
  not_started_kpis: number;
  blocked_kpis: number;
  completion_percentage: number;
}

export interface SectionAnalytics extends KpiAnalytics {
  section_id: string;
  section_name: string;
  site_name: string;
}

export interface SiteAnalytics extends KpiAnalytics {
  site_id: string;
  site_name: string;
  sections: SectionAnalytics[];
}

// Grid editing types
export interface GridEditEvent {
  cell_id: string;
  kpi_id?: string;
  period_id?: string;
  old_value?: string;
  new_value?: string;
  user_id: string;
  timestamp: string;
}

export interface CursorPosition {
  row: number;
  col: number;
  user_id: string;
  user_name: string;
  color: string;
}

export interface CellSelection {
  start_row: number;
  start_col: number;
  end_row: number;
  end_col: number;
  user_id: string;
}
