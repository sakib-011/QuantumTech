import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant } from '../types';
import { cartService } from '../services/cartService';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';

interface CartContextType {
  items: CartItem[];
  totalCount: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => boolean;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  serverQuote: import('../services/cartService').ServerCartQuote | null;
}


const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => cartService.getCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [serverQuote, setServerQuote] = useState<import('../services/cartService').ServerCartQuote | null>(null);
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  useEffect(() => {
    const handleCartSync = () => {
      setItems(cartService.getCart());
    };
    window.addEventListener('quantum_cart_updated', handleCartSync);
    return () => window.removeEventListener('quantum_cart_updated', handleCartSync);
  }, []);

  // Fetch live server quote whenever cart items change
  useEffect(() => {
    const fetchQuote = async () => {
      const quote = await cartService.validateCartLive(items);
      setServerQuote(quote);
      if (quote?.issues?.length) {
        quote.issues.forEach(issue => {
          showToast(issue, 'warning');
        });
      }
    };
    if (items.length) {
      fetchQuote();
    } else {
      setServerQuote(null);
    }
  }, [items]);


  const { totalCount, subtotal } = cartService.calculateTotals(items);

  const addToCart = (product: Product, variant?: ProductVariant, quantity: number = 1): boolean => {
    const res = cartService.addToCart(product, variant, quantity);
    setItems(res.items);

    if (!res.success) {
      showToast(
        language === 'bn'
          ? (res.error?.includes('out of stock') ? 'দুঃখিত, পণ্যটি বর্তমানে স্টকে নেই।' : res.error || 'পণ্যটি যোগ করা সম্ভব হয়নি।')
          : (res.error || 'Could not add item to cart.'),
        'warning',
        language === 'bn' ? 'স্টক সতর্কতা' : 'Stock Alert'
      );
      return false;
    }

    const productName = language === 'bn' ? product.nameBn : product.name;
    const formattedQuantity = quantity.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US');
    showToast(
      language === 'bn'
        ? `"${productName}" কার্টে যোগ করা হয়েছে (${formattedQuantity} টি)।`
        : `"${productName}" added to your cart (quantity: ${formattedQuantity}).`,
      'success',
      language === 'bn' ? 'কার্টে যোগ হয়েছে' : 'Added to Cart'
    );
    return true;
  };

  const removeFromCart = (itemId: string) => {
    const updated = cartService.removeFromCart(itemId);
    setItems(updated);
    showToast(
      language === 'bn' ? 'পণ্যটি কার্ট থেকে মুছে ফেলা হয়েছে।' : 'Item removed from your cart.',
      'info'
    );
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    const res = cartService.updateQuantity(itemId, quantity);
    setItems(res.items);

    if (res.error) {
      showToast(
        language === 'bn' ? 'সর্বোচ্চ স্টকে থাকা পরিমাণ প্রযোজ্য করা হয়েছে।' : res.error,
        'warning'
      );
    }
  };

  const clearCart = () => {
    cartService.clearCart();
    setItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        serverQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
