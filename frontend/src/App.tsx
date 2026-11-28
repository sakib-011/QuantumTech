import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ScrollToTop } from './components/ScrollToTop';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AppRoutes } from './routes';
import { connectBackend } from './services/backend';

export const App: React.FC = () => {
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    let retryDelay = 5000;
    const connect = async () => {
      const connected = await connectBackend();
      if (!connected && !stopped) {
        timer = window.setTimeout(() => void connect(), retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      } else if (connected) {
        retryDelay = 5000;
      }
    };
    void connect();
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <CartProvider>
              <AdminAuthProvider>
                <AppRoutes />
              </AdminAuthProvider>
            </CartProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
