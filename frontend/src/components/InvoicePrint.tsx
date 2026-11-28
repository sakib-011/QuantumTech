import React from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../types';
import { formatCurrency } from '../utilities/currency';
import { settingsService } from '../services/settingsService';

interface InvoicePrintProps {
  order: Order;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({ order }) => {
  const settings = settingsService.getSettings();
  const createdAt = new Date(order.createdAt);
  const orderDate = Number.isNaN(createdAt.getTime())
    ? order.createdAt
    : createdAt.toLocaleString('en-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return createPortal(
    <section className="print-invoice">
      <header className="invoice-header invoice-avoid-break">
        <div className="invoice-brand">
          <div className="invoice-mark">Q</div>
          <div>
            <h1>{settings.storeName || 'QuantumTech'}</h1>
            <p>{settings.tagline || 'Modern Tech Accessories'}</p>
            {[settings.address, settings.phone, settings.email].filter(Boolean).map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        </div>
        <div className="invoice-heading">
          <span>INVOICE</span>
          <strong>{order.orderNumber}</strong>
          <small>Issued {orderDate}</small>
        </div>
      </header>

      <div className="invoice-information invoice-avoid-break">
        <section>
          <h2>Bill to</h2>
          <strong>{order.customerName}</strong>
          <span>{order.phone}</span>
          <span>{order.address}</span>
          <span>{order.area}</span>
        </section>
        <section>
          <h2>Order details</h2>
          <span>Order status: <strong>{order.status}</strong></span>
          <span>Payment method: <strong>{order.paymentMethod}</strong></span>
          <span>Payment status: <strong>{order.paymentStatus}</strong></span>
          {order.trxId && <span>Transaction ID: <strong>{order.trxId}</strong></span>}
        </section>
      </div>

      <table className="invoice-items">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.productName}</strong>
                {item.variantName && <small>{item.variantName}</small>}
              </td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unitPrice, 'en')}</td>
              <td>{formatCurrency(item.lineTotal, 'en')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-summary invoice-avoid-break">
        <div>
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal, 'en')}</span>
        </div>
        {order.couponDiscount && order.couponDiscount > 0 && (
          <div>
            <span>Coupon discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
            <span>-{formatCurrency(order.couponDiscount, 'en')}</span>
          </div>
        )}
        <div>
          <span>Delivery ({order.area})</span>
          <span>{formatCurrency(order.deliveryCharge, 'en')}</span>
        </div>
        <div className="invoice-total">
          <strong>Total due</strong>
          <strong>{formatCurrency(order.total, 'en')}</strong>
        </div>
      </div>

      {order.note && (
        <div className="invoice-note invoice-avoid-break">
          <strong>Order note:</strong> {order.note}
        </div>
      )}

      <footer className="invoice-footer">
        Thank you for shopping with {settings.storeName || 'QuantumTech'}.
      </footer>
    </section>,
    document.body
  );
};
