export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  email: string;
  name: string;
  role: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
}
