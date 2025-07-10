import React from 'react';
import { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { formatToYYYYMMDDWithTime } from '@/lib/date-utils';
import AnniesWayLogo from '@/assets/Annie\'s-Way-LOGO-new.png';

interface OrderInvoiceProps {
  order: Order;
}

export const OrderInvoice = React.forwardRef<HTMLDivElement, OrderInvoiceProps>(({ order }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} className="p-8 bg-white text-black">
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <img src={AnniesWayLogo} alt="Annie's Way" className="w-48" />
          <p className="mt-2 text-sm">Annie's Way Mask Gallery</p>
          <p className="text-sm">support@anniesway.com.tw</p>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold">INVOICE</h1>
          <p className="text-sm">Order #{order.orderNumber}</p>
          <p className="text-sm">Date: {formatToYYYYMMDDWithTime(new Date(order.orderDate))}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-bold mb-2">Bill To:</h2>
        <p>{order.customerName}</p>
        {/* Add more customer details if available, e.g., address, phone */}
      </div>

      <table className="w-full mb-8 text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Product</th>
            <th className="text-right py-2">Quantity</th>
            <th className="text-right py-2">Unit Price</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId} className="border-b">
              <td className="py-2">{item.productName}</td>
              <td className="text-right py-2">{item.quantity}</td>
              <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
              <td className="text-right py-2">{formatCurrency(item.unitPrice * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-1/3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
          {/* Add tax/shipping if applicable */}
          <div className="flex justify-between font-bold mt-2 pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>
       <div className="mt-16 text-xs text-center text-gray-500">
        <p>Thank you for your business!</p>
        <p>Annie's Way Mask Gallery</p>
      </div>
    </div>
  );
}); 