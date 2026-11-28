import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CartDrawer } from '../components/CartDrawer';
import { ToastContainer } from '../components/Toast';
import { FloatingChatButton } from '../components/FloatingChatButton';
import { PromotionalPopupContainer } from '../components/PromotionalPopupContainer';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-surface-alt text-ink">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <ToastContainer />
      <FloatingChatButton />
      <PromotionalPopupContainer />
    </div>
  );
};
