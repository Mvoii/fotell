// Auth interfaces for authentication pages (mirrors backend contract)

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  created_at: string;
}