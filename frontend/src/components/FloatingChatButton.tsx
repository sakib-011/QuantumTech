import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';
import { defaultStoreSettings } from '../data/seedData';
import { useLanguage } from '../context/LanguageContext';

export const FloatingChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  const whatsappUrl = `https://wa.me/${defaultStoreSettings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello QuantumTech! I have a question about your products.')}`;
  const messengerUrl = defaultStoreSettings.messengerUrl;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-auto">
      {/* Popover Options */}
      {isOpen && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface border border-border p-3 shadow-float animate-fadeIn min-w-[200px]">
          <span className="caption-4 text-muted px-2 font-semibold uppercase tracking-wider">
            {language === 'bn' ? 'সরাসরি সহায়তা' : 'Customer Support'}
          </span>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-ink hover:text-emerald-700 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white flex-shrink-0">
              <FontAwesomeIcon icon={Icons.whatsapp} className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="title-4 font-semibold text-ink leading-tight">WhatsApp</span>
              <span className="caption-5 text-muted">Instant reply</span>
            </div>
          </a>

          <a
            href={messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-ink hover:text-blue-700 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white flex-shrink-0">
              <FontAwesomeIcon icon={Icons.messenger} className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="title-4 font-semibold text-ink leading-tight">Messenger</span>
              <span className="caption-5 text-muted">Facebook chat</span>
            </div>
          </a>
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-quantum text-white shadow-float hover:bg-quantum-hover active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-quantum/30"
        aria-label={isOpen ? 'Close chat options' : 'Open instant chat support'}
      >
        <FontAwesomeIcon
          icon={isOpen ? Icons.close : Icons.whatsapp}
          className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
    </div>
  );
};
