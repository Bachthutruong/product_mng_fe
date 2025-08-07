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
          <h1 className="text-3xl font-bold">發票</h1>
          <p className="text-sm">訂單 #{order.orderNumber}</p>
          <p className="text-sm">日期: {formatToYYYYMMDDWithTime(new Date(order.orderDate))}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-bold mb-2">收件人:</h2>
        <p>{order.customerName}</p>
        {/* Add more customer details if available, e.g., address, phone */}
      </div>

      <table className="w-full mb-8 text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">產品</th>
            <th className="text-right py-2">數量</th>
            <th className="text-right py-2">單價</th>
            <th className="text-right py-2">總計</th>
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
            <span>小計</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
          {/* Add tax/shipping if applicable */}
          <div className="flex justify-between font-bold mt-2 pt-2 border-t">
            <span>總計</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>
       <div className="mt-16 text-xs text-center text-gray-500">
        <p>感謝您的惠顧！</p>
        <p>Annie's Way Mask Gallery</p>
      </div>
    </div>
  );
}); 