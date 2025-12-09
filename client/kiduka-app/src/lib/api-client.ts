/**
 * Enhanced API Client for FastAPI Backend with Role-Based Access
 * Handles all HTTP requests to authentication and admin endpoints
 */

// User Role Types
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin"
}

// Enhanced User Types
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

// Auth Types
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

// Admin Dashboard Types
export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  total_predictions: number;
  flagged_predictions: number;
  recent_users: number;
  recent_predictions: number;
  users_by_role: Record<string, number>;
  predictions_by_status: Record<string, number>;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  recent_users: AdminUserResponse[];
  recent_predictions: any[];
  recent_audit_logs: any[];
}

// List Response Types
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

export class ApiClient {
  private baseUrl: string;

  constructor() {
    // FIX 1: Enhanced Environment Handling
    if (typeof window === 'undefined') {
      // SERVER-SIDE (SSR): 
      // Use internal Docker network URL. Defaults to 'http://api:8000' if API_URL env is missing.
      this.baseUrl = process.env.API_URL || 'http://api:8000';
    } else {
      // CLIENT-SIDE (Browser):
      // Use Nginx proxy path. Defaults to '/api' to ensure we hit Nginx port 80.
      // NEVER default to 127.0.0.1:8000 here, as that port is closed in Docker.
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    }
  }

  /**
   * Generic request method with error handling
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // CRITICAL FIX: Destructure headers from options to avoid override
    const { headers: optionsHeaders, ...restOptions } = options;
    
    const config: RequestInit = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...optionsHeaders,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Better error message formatting
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Pydantic validation errors
            const validationErrors = errorData.detail.map((err: any) => 
              `${err.loc?.join('.') || 'field'}: ${err.msg}`
            ).join('; ');
            errorMessage = `Validation error: ${validationErrors}`;
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  // ===== AUTHENTICATION ENDPOINTS =====

  /**
   * Register a new user
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }): Promise<UserResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Login user with credentials
   */
  async login(credentials: {
    username_or_email: string;
    password: string;
  }): Promise<LoginResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Get current user information
   */
  async getCurrentUser(token: string): Promise<UserResponse> {
    return this.request('/auth/me', {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Update user profile
   */
  async updateUser(userData: {
    username?: string;
    email?: string;
    full_name?: string;
    is_active?: boolean;
  }, token: string): Promise<UserResponse> {
    return this.request('/auth/me', {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(userData),
    });
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
  }, token: string): Promise<{ message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(passwordData),
    });
  }

  /**
   * Delete user account
   */
  async deleteUser(token: string): Promise<{ message: string }> {
    return this.request('/auth/me', {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Check admin access
   */
  async checkAdminAccess(token: string): Promise<{
    message: string;
    user: {
      id: string;
      username: string;
      role: UserRole;
      is_super_admin: boolean;
    };
  }> {
    return this.request('/admin-check', {
      headers: this.getAuthHeaders(token),
    });
  }

  // ===== ADMIN ENDPOINTS =====

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard(token: string): Promise<AdminDashboardResponse> {
    return this.request('/admin/dashboard/', {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(
    token: string,
    page: number = 1,
    size: number = 20,
    search?: string,
    role?: UserRole,
    is_active?: boolean
  ): Promise<PaginatedResponse<AdminUserResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (is_active !== undefined) params.append('is_active', is_active.toString());

    return this.request(`/admin/users/?${params.toString()}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Get specific user by ID (admin only)
   */
  async getUserById(userId: string, token: string): Promise<AdminUserResponse> {
    return this.request(`/admin/users/${userId}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Update user by ID (admin only)
   */
  async updateUserById(
    userId: string,
    userData: {
      username?: string;
      email?: string;
      full_name?: string;
      role?: UserRole;
      is_active?: boolean;
      is_verified?: boolean;
      notes?: string;
    },
    token: string
  ): Promise<AdminUserResponse> {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(userData),
    });
  }

  /**
   * Delete user by ID (admin only)
   */
  async deleteUserById(userId: string, token: string): Promise<{ message: string }> {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Reset user password (admin only)
   */
  async resetUserPassword(
    userId: string,
    newPassword: string,
    token: string
  ): Promise<{ message: string }> {
    return this.request(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  /**
   * Create new user (admin only)
   */
  async createUser(
    userData: {
      username: string;
      email: string;
      password: string;
      full_name?: string;
      role?: UserRole;
      notes?: string;
    },
    token: string
  ): Promise<AdminUserResponse> {
    return this.request('/admin/users/', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(userData),
    });
  }

  /**
   * Get all predictions (admin only)
   */
  async getAllPredictions(
    token: string,
    page: number = 1,
    size: number = 20,
    userId?: string,
    flagged?: boolean
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (userId) params.append('user_id', userId);
    if (flagged !== undefined) params.append('flagged', flagged.toString());

    return this.request(`/admin/predictions/?${params.toString()}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Update prediction (admin only)
   */
  async updatePrediction(
    predictionId: string,
    updateData: {
      is_flagged?: boolean;
      admin_notes?: string;
    },
    token: string
  ): Promise<any> {
    return this.request(`/admin/predictions/${predictionId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete prediction (admin only)
   */
  async deletePrediction(predictionId: string, token: string): Promise<{ message: string }> {
    return this.request(`/admin/predictions/${predictionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Get audit logs (admin only)
   */
  async getAuditLogs(
    token: string,
    page: number = 1,
    size: number = 20,
    adminUserId?: string,
    action?: string
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (adminUserId) params.append('admin_user_id', adminUserId);
    if (action) params.append('action', action);

    return this.request(`/admin/audit-logs/?${params.toString()}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(token: string): Promise<any> {
    return this.request('/admin/stats/', {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Get agrovets (admin only)
   */
  async getAgrovets(
    token: string,
    page: number = 1,
    size: number = 20
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    return this.request(`/admin/agrovets/?${params.toString()}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Update agrovet (admin only)
   */
  async updateAgrovet(
    agrovetId: string,
    updateData: any,
    token: string
  ): Promise<any> {
    return this.request(`/admin/agrovets/${agrovetId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(updateData),
    });
  }

  // ===== PREDICTION ENDPOINTS =====

  /**
   * Make soil prediction
   */
  async makePrediction(soilData: any, token?: string): Promise<any> {
    const headers = token ? this.getAuthHeaders(token) : {};   
    return this.request('/predictions/predict', {
      method: 'POST',
      headers,
      body: JSON.stringify(soilData),
    });
  }

  /**
   * Get user's prediction history
   */
  async getPredictionHistory(
    token: string,
    page: number = 1,
    size: number = 20
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    return this.request(`/predictions/history/?${params.toString()}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Get specific prediction
   */
  async getPrediction(predictionId: string, token: string): Promise<any> {
    return this.request(`/predictions/history/${predictionId}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  /**
   * Delete user's prediction
   */
  async deletePredictionHistory(predictionId: string, token: string): Promise<{ message: string }> {
    return this.request(`/predictions/history/${predictionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();