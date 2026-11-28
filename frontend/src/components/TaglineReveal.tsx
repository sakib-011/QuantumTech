import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface TaglineRevealProps {
  className?: string;
}

export const TaglineReveal: React.FC<TaglineRevealProps> = ({ className = '' }) => {
  const { language, t } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeWordsCount, setActiveWordsCount] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const textLead = t.taglineReveal.lead;
  const textStatement = t.taglineReveal.statement;
  const fullText = `${textLead} ${textStatement}`;
  const words = fullText.split(' ');

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setActiveWordsCount(words.length);
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!sectionRef.current) return;
          const rect = sectionRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;

          // When top of section enters 85% of screen to 25% of screen
          const start = windowHeight * 0.85;
          const end = windowHeight * 0.25;

          if (rect.top <= start) {
            const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
            const count = Math.floor(progress * words.length);
            setActiveWordsCount(count);
          } else {
            setActiveWordsCount(0);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [words.length]);

  return (
    <section
      ref={sectionRef}
      className={`py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center ${className}`}
      aria-label="Core Brand Tagline"
    >
      <div className="max-w-[680px] mx-auto">
        <span className="caption-3 px-3 py-1 rounded-full bg-quantum-soft text-quantum font-semibold uppercase tracking-wider mb-6 inline-block">
          {language === 'bn' ? 'কোয়ালিটি গ্যারান্টি' : 'The Quantum Commitment'}
        </span>

        <h2 className="heading-3 sm:heading-2 font-semibold tracking-tight leading-snug">
          {words.map((word, index) => {
            const isActive = prefersReducedMotion || index < activeWordsCount;
            return (
              <span
                key={`${word}-${index}`}
                className={`inline-block mr-[0.3em] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? 'text-ink opacity-100 scale-100'
                    : 'text-ink/30 opacity-30 scale-[0.98]'
                }`}
              >
                {word}
              </span>
            );
          })}
        </h2>
      </div>
    </section>
  );
};
