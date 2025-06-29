// lib/api-client.ts

/**
 * API Client for FastAPI Backend
 * Handles all HTTP requests to the authentication endpoints
 */

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Generic request method with error handling
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
  }) {
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
  }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Get current user information
   */
  async getCurrentUser(token: string) {
    return this.request('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  }, token: string) {
    return this.request('/auth/me', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
  }, token: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });
  }

  /**
   * Delete user account
   */
  async deleteUser(token: string) {
    return this.request('/auth/me', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Verify email (if you implement this endpoint)
   */
  async verifyEmail(token: string) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Request password reset (if you implement this endpoint)
   */
  async requestPasswordReset(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Reset password with token (if you implement this endpoint)
   */
  async resetPassword(resetData: {
    token: string;
    new_password: string;
  }) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export types for use in other files
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}