import React from 'react';

export type FooterTopic = 'terms' | 'privacy' | 'refund' | 'faq' | 'contact';

interface FooterProps {
  onOpenTopic: (topic: FooterTopic) => void;
  onOpenAdmin?: () => void;
}

const FOOTER_LINKS: { id: FooterTopic; label: string }[] = [
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'refund', label: 'Refund Policy' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact Us' },
];

export const Footer: React.FC<FooterProps> = ({ onOpenTopic, onOpenAdmin }) => {
  return (
    <footer className="bg-[#030304] border-t border-white/10 py-2.5 pb-16 md:pb-2.5 text-[11.5px] text-white/65">
      <div className="max-w-[1460px] mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="hidden lg:block w-36" aria-hidden="true" />

        <nav className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1" aria-label="Footer links">
          {FOOTER_LINKS.map((link, idx) => (
            <React.Fragment key={link.id}>
              {idx > 0 && (
                <span className="text-white/25 select-none" aria-hidden="true">
                  |
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpenTopic(link.id)}
                className="hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                {link.label}
              </button>
            </React.Fragment>
          ))}
          {onOpenAdmin && (
            <>
              <span className="text-white/25 select-none" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="hover:text-[#FF3B42] transition-colors whitespace-nowrap cursor-pointer"
              >
                Admin Portal
              </button>
            </>
          )}
        </nav>

        <p className="text-white/60 whitespace-nowrap">
          © 2025 Key2Show. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};
