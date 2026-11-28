import { api } from './backend';

export interface AdminCustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  deliveryArea: string | null;
  address: string | null;
  blocked: boolean;
  createdAt: string;
  orderCount: number;
  deliveredOrderCount: number;
  deliveredRevenue: number;
  lastOrderAt: string | null;
}

export interface AdminCustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
}

export const adminCustomerService = {
  list(): Promise<AdminCustomerSummary[]> {
    return api('/api/admin/customers');
  },

  getOrders(customerId: string): Promise<AdminCustomerOrder[]> {
    return api(`/api/admin/customers/${encodeURIComponent(customerId)}/orders`);
  },

  setBlocked(customerId: string, blocked: boolean): Promise<void> {
    return api(`/api/admin/customers/${encodeURIComponent(customerId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ blocked }),
    });
  },

  delete(customerId: string): Promise<void> {
    return api(`/api/admin/customers/${encodeURIComponent(customerId)}`, {
      method: 'DELETE',
    });
  },
};
