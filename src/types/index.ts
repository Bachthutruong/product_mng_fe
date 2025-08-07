export interface User {
  id: string;
  _id: string;
  name: string;
  fullName: string;
  email: string;
  role: 'admin' | 'employee';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCategory {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  images: { url: string; publicId: string; isPrimary: boolean }[];
  description: string;
  price: number;
  cost?: number;
  unit?: string;
  categoryId: string;
  categoryName?: string;
  stock: number;
  lowStockThreshold: number;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  taxId?: string;
  categoryId: string;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed' | 'returned';
  orderDate: string;
  shippingAddress?: string;
  notes?: string;
  storeShippingCost?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedByName?: string;
  createdByUserId: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  _id: string;
  productId: string;
  productName: string;
  type: 'stock-in' | 'stock-out' | 'adjustment-add' | 'adjustment-remove';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  userName?: string;
  reason?: string;
  notes?: string;
  movementDate: string; // Changed from createdAt
  createdAt: string;
  batchExpiryDate?: string;
  isReverted?: boolean;
  isRevertible?: boolean;
} 