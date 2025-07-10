import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import OrdersPage from '@/pages/OrdersPage'
import CustomersPage from '@/pages/CustomersPage'
import InventoryPage from '@/pages/InventoryPage'
import ReportsPage from '@/pages/ReportsPage'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import UsersPage from '@/pages/admin/UsersPage'
import DeletedOrdersPage from '@/pages/admin/DeletedOrdersPage'
import ProductCategoriesPage from '@/pages/ProductCategoriesPage'
import CustomerCategoriesPage from '@/pages/CustomerCategoriesPage'
import OrderDetailsPage from '@/pages/OrderDetailsPage'
import ProductDetailsPage from '@/pages/ProductDetailsPage'
import EditOrderPage from '@/pages/EditOrderPage'
import CustomerOrdersPage from "@/pages/customers/CustomerOrdersPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailsPage />} />
          <Route path="categories" element={<ProductCategoriesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />
          <Route path="orders/:id/edit" element={<EditOrderPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId/orders" element={<CustomerOrdersPage />} />
          <Route path="customer-categories" element={<CustomerCategoriesPage />} />
          <Route path="reports" element={<ReportsPage />} />

          {/* Admin Routes */}
          <Route path="admin/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="admin/deleted-orders" element={<ProtectedRoute roles={['admin']}><DeletedOrdersPage /></ProtectedRoute>} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      <Toaster />
    </AuthProvider>
  )
}

export default App 