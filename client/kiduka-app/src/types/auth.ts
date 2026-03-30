// types/auth.ts

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin"
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface AdminUserResponse extends UserResponse {
  created_by: string | null;
  notes: string | null;
  prediction_count: number | null;
  session_count: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_role: UserRole;
}

export interface TokenData {
  user_id: string;
  username: string;
  role: UserRole;
}
