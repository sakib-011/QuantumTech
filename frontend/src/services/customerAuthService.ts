import { DeliveryArea, Order } from '../types';
import { getItem, removeItem, setItem } from '../utilities/storage';
import { api, getCustomerToken, mapPublicOrder, rememberOrder, setCustomerToken } from './backend';

const CUSTOMER_SESSION_KEY = 'qt_customer_session';

export interface CustomerSession {
  id: string;
  email: string;
  name: string;
  phone: string;
  deliveryArea?: DeliveryArea | null;
  address?: string | null;
  role: 'Customer';
}

interface CustomerAuthResponse extends CustomerSession {
  token: string;
}

export interface CustomerProfile extends CustomerSession {
  createdAt: string;
}

function saveSession(response: CustomerAuthResponse): CustomerSession {
  const { token, ...session } = response;
  setCustomerToken(token);
  setItem(CUSTOMER_SESSION_KEY, session);
  window.dispatchEvent(new Event('quantum_customer_auth_updated'));
  return session;
}

export const customerAuthService = {
  getSession(): CustomerSession | null {
    if (!getCustomerToken()) return null;
    return getItem<CustomerSession | null>(CUSTOMER_SESSION_KEY, null);
  },

  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    deliveryArea: DeliveryArea;
    address: string;
  }): Promise<CustomerSession> {
    const response = await api<CustomerAuthResponse>('/api/auth/customer/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return saveSession(response);
  },

  async login(email: string, password: string): Promise<CustomerSession> {
    const response = await api<CustomerAuthResponse>('/api/auth/customer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return saveSession(response);
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return api<{ message: string }>('/api/auth/customer/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    return api<{ resetToken: string }>('/api/auth/customer/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return api<{ message: string }>('/api/auth/customer/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  logout(): void {
    setCustomerToken(null);
    removeItem(CUSTOMER_SESSION_KEY);
    window.dispatchEvent(new Event('quantum_customer_auth_updated'));
  },

  async getProfile(): Promise<CustomerProfile> {
    return api<CustomerProfile>('/api/customer/me');
  },

  async updateProfile(data: { deliveryArea: DeliveryArea; address: string }): Promise<CustomerProfile> {
    const profile = await api<CustomerProfile>('/api/customer/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const session = this.getSession();
    if (session) {
      setItem(CUSTOMER_SESSION_KEY, {
        ...session,
        deliveryArea: profile.deliveryArea,
        address: profile.address,
      });
    }
    return profile;
  },

  async updatePersonalDetails(data: {
    name: string;
    email: string;
    phone: string;
  }): Promise<CustomerProfile> {
    const response = await api<{ token: string; profile: CustomerProfile }>('/api/customer/me/personal', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    setCustomerToken(response.token);
    const session = this.getSession();
    if (session) {
      setItem(CUSTOMER_SESSION_KEY, {
        ...session,
        name: response.profile.name,
        email: response.profile.email,
        phone: response.profile.phone,
      });
    }
    return response.profile;
  },

  async getOrders(): Promise<Order[]> {
    const rawOrders = await api<Array<Record<string, unknown>>>('/api/customer/orders');
    return rawOrders.map((order) => {
      const mapped = mapPublicOrder(order, 'en');
      rememberOrder(mapped);
      return mapped;
    });
  },
};
