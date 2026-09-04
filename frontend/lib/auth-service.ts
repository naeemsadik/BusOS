import api from './api';
import Cookies from 'js-cookie';
import {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  InviteUserRequest,
  AcceptInvitationRequest,
  User,
  ApiResponse,
  Invitation,
} from './types';

export const authService = {
  // Authentication
  async register(data: RegisterRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async verifyEmail(data: VerifyEmailRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/verify-email', data);
    return response.data;
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  async resendVerification(data: ResendVerificationRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/resend-verification', data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Invitations
  async inviteUser(data: InviteUserRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/invite', data);
    return response.data;
  },

  async acceptInvitation(data: AcceptInvitationRequest): Promise<ApiResponse> {
    const response = await api.post('/auth/accept-invitation', data);
    return response.data;
  },

  async getInvitations(): Promise<Invitation[]> {
    const response = await api.get('/auth/invitations');
    return response.data;
  },

  async resendInvitation(invitationId: string): Promise<ApiResponse> {
    const response = await api.post(`/auth/invitations/${invitationId}/resend`);
    return response.data;
  },

  async revokeInvitation(invitationId: string): Promise<ApiResponse> {
    const response = await api.delete(`/auth/invitations/${invitationId}`);
    return response.data;
  },

  // Logout
  logout(): void {
    // Since we're using stateless JWT, we just remove the token
    // Check if we're in a browser environment before using Cookies
    if (typeof window !== 'undefined') {
      Cookies.remove('access_token', { path: '/' });
    }
  },
};
