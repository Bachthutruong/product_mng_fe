import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to handle auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockpilot-token');
  console.log('Interceptor - Token present:', !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No auth token found');
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('Response interceptor error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('stockpilot-token');
      // Redirect to login if needed
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Specific API functions
export const login = async (credentials: any) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

export const getCustomers = async ({ page = 1, limit = 10, search = '' }) => {
  const { data } = await api.get('/customers', {
    params: { page, limit, search }
  });
  return data;
};

export const createCustomer = async (customerData: any) => {
  const { data } = await api.post('/customers', customerData);
  return data;
};

export const updateCustomer = async ({ id, customerData }: { id: string, customerData: any }) => {
  const { data } = await api.put(`/customers/${id}`, customerData);
  return data;
};

export const deleteCustomer = async (id: string) => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};

export const getCustomer = async (id: string) => {
  const { data } = await api.get(`/customers/${id}`);
  return data;
};

// --- Product APIs ---
export const getProducts = async (params: { page?: number; limit?: number; search?: string; categoryId?: string; stockStatus?: string; }) => {
  const { data } = await api.get('/products', { params });
  return data;
};

export const createProduct = async (productData: any) => {
  const { data } = await api.post('/products', productData);
  return data;
};

export const updateProduct = async ({ id, productData }: { id: string, productData: any }) => {
  const { data } = await api.put(`/products/${id}`, productData);
  return data;
};

export const deleteProduct = async (id: string) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const getProduct = async (id: string) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export const uploadProductImages = async ({ id, formData }: { id: string, formData: FormData }) => {
  const { data } = await api.post(`/products/${id}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const deleteProductImage = async ({ productId, imageId }: { productId: string, imageId: string }) => {
    const { data } = await api.delete(`/products/${productId}/images/${imageId}`);
    return data;
};

export const setPrimaryProductImage = async ({ productId, imageId }: { productId: string, imageId: string }) => {
    const { data } = await api.put(`/products/${productId}/images/${imageId}/primary`);
    return data;
};

// Product Categories
export const getProductCategories = async (search: string = '') => {
  const response = await api.get('/products/categories', {
      params: { search }
  });
  return response.data.data;
};

export const createProductCategory = async (categoryData: any) => {
  const response = await api.post('/products/categories', categoryData);
  return response.data;
};

export const updateProductCategory = async (id: string, categoryData: any) => {
  const response = await api.put(`/products/categories/${id}`, categoryData);
  return response.data;
};

export const deleteProductCategory = async (id: string) => {
  const response = await api.delete(`/products/categories/${id}`);
  return response.data;
};

// Customer Categories
export const getCustomerCategories = async ({ page = 1, limit = 10 }: { page?: number, limit?: number } = {}) => {
  try {
    const response = await api.get('/customer-categories', {
      params: { page, limit }
    });
    
    if (!response.data?.success) {
      console.error('API returned success: false');
      throw new Error('Failed to fetch customer categories');
    }
    
    // The backend now returns { success, data, pagination }
    return response.data;
  } catch (error: any) {
    console.error('Error fetching customer categories:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const createCustomerCategory = async (categoryData: any) => {
  const response = await api.post('/customer-categories', categoryData);
  return response.data;
};

export const updateCustomerCategory = async (id: string, categoryData: any) => {
  const response = await api.put(`/customer-categories/${id}`, categoryData);
  return response.data;
};

export const deleteCustomerCategory = async (id: string) => {
  const response = await api.delete(`/customer-categories/${id}`);
  return response.data;
};

// --- Dashboard APIs ---
export const getDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};

export const getRecentActivity = async () => {
  const { data } = await api.get('/dashboard/recent-activity');
  return data;
};

export const getInventoryAlerts = async () => {
  const { data } = await api.get('/dashboard/inventory-alerts');
  return data;
};

// --- Order APIs ---
export const getOrders = async (params: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  status?: string; 
  startDate?: string; 
  endDate?: string; 
  customerId?: string;
}) => {
  const response = await api.get('/orders', { params });
  return response.data;
};

export const getOrder = async (id: string) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const createOrder = async (orderData: any) => {
  const { data } = await api.post('/orders', orderData);
  return data;
};

export const updateOrder = async (id: string, orderData: any) => {
  const { data } = await api.put(`/orders/${id}`, orderData);
  return data;
};

export const updateOrderStatus = async ({ id, status }: { id: string, status: string }) => {
  const { data } = await api.put(`/orders/${id}/status`, { status });
  return data;
};

export const deleteOrder = async (id: string) => {
  const { data } = await api.delete(`/orders/${id}`);
  return data;
};

// --- Inventory APIs ---
export const getInventoryMovements = async (params: any) => {
  const { data } = await api.get('/inventory/movements', { params });
  return data;
};

export const recordStockIn = async (stockInData: any) => {
  const { data } = await api.post('/inventory/stock-in', stockInData);
  return data;
};

export const recordStockAdjustment = async (adjustmentData: any) => {
  const { data } = await api.post('/inventory/adjustment', adjustmentData);
  return data;
};

export const revertInventoryMovement = async (movementId: string) => {
  const { data } = await api.post(`/inventory/movements/${movementId}/revert`);
  return data;
};

// --- Admin APIs ---
export const getUsers = async (search: string = '') => {
  const { data } = await api.get('/admin/users', {
    params: { search }
  });
  return data;
};

export const addUser = async (userData: any) => {
  const { data } = await api.post('/admin/users', userData);
  return data;
};

export const updateUser = async (id: string, userData: any) => {
  const { data } = await api.put(`/admin/users/${id}`, userData);
  return data;
};

export const deleteUser = async (id: string) => {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
};

export const getDeletedOrders = async (params: any = {}) => {
  const { data } = await api.get('/admin/deleted-orders', { params });
  return data;
};

export const restoreOrder = async (id: string) => {
  const { data } = await api.put(`/admin/restore-order/${id}`);
  return data;
};

// --- Reports APIs ---
export const getSalesSummary = async (params?: { startDate: string, endDate: string }) => {
  const { data } = await api.get('/reports/sales-summary', { params });
  return data;
};

// You can add other api functions here
// e.g. getOrders, etc. 