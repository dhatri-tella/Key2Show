import React from 'react';

export type FooterTopic = 'terms' | 'privacy' | 'refund' | 'faq' | 'contact';

interface FooterProps {
  onOpenTopic: (topic: FooterTopic) => void;
  onOpenAdmin?: () => void;
  onNavigate?: (path: string) => void;
}

const FOOTER_LINKS: { id: FooterTopic; label: string }[] = [
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'refund', label: 'Refund Policy' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact Us' },
];

export const Footer: React.FC<FooterProps> = ({ onOpenTopic, onOpenAdmin, onNavigate }) => {
  return (
    <footer className="bg-[#030304]/95 border-t border-white/10 py-8 pb-20 md:pb-8 text-[12px] text-white/65">
      <div className="max-w-[1460px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-7 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <h2 className="font-display text-base font-bold text-white">Key2Show</h2>
            <p className="mt-2 max-w-[220px] leading-relaxed">
              Your entertainment. Your ticket. Your show.
            </p>
          </div>
          <FooterColumn title="Quick Links">
            <FooterButton label="Home" onClick={() => onNavigate?.('/')} />
            <FooterButton label="Movies" onClick={() => onNavigate?.('/movies')} />
            <FooterButton label="Events" onClick={() => onNavigate?.('/events')} />
            <FooterButton label="Theatres" onClick={() => onNavigate?.('/theatres')} />
            <FooterButton label="About Key2Show" onClick={() => onNavigate?.('/about')} />
          </FooterColumn>
          <FooterColumn title="Support">
            <FooterButton label="Contact Us" onClick={() => onOpenTopic('contact')} />
            <FooterButton label="Customer Support" onClick={() => onNavigate?.('/help')} />
            <FooterButton label="FAQ" onClick={() => onNavigate?.('/help')} />
            <FooterButton label="Help" onClick={() => onNavigate?.('/help')} />
          </FooterColumn>
          <FooterColumn title="Policies">
            {FOOTER_LINKS.filter((link) => link.id !== 'contact' && link.id !== 'faq').map((link) => (
              <FooterButton key={link.id} label={link.label} onClick={() => onOpenTopic(link.id)} />
            ))}
          </FooterColumn>
          <FooterColumn title="Follow Us">
            <div className="flex items-center gap-2.5 pt-1">
              {['Facebook', 'Instagram', 'YouTube', 'X'].map((network) => (
                <button
                  key={network}
                  type="button"
                  aria-label={`Key2Show on ${network}`}
                  onClick={() => onOpenTopic('contact')}
                  className="h-8 min-w-8 rounded-full border border-white/20 px-2 text-[10px] font-bold text-white/80 hover:border-[#FF1822] hover:text-white transition-colors"
                >
                  {network === 'Facebook' ? 'f' : network === 'Instagram' ? 'ig' : network === 'YouTube' ? 'yt' : 'X'}
                </button>
              ))}
            </div>
          </FooterColumn>
        </div>
        <div className="mt-8 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {onOpenAdmin && (
            <button type="button" onClick={onOpenAdmin} className="hover:text-[#FF3B42] transition-colors cursor-pointer">
              Admin Portal
            </button>
          )}
          <p className="text-white/60">© 2025 Key2Show. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const FooterColumn: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <div>
    <h3 className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/90">{title}</h3>
    <div className="mt-3 flex flex-col items-start gap-2">{children}</div>
  </div>
);

const FooterButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" onClick={onClick} className="text-left hover:text-white transition-colors cursor-pointer">
    {label}
  </button>
);
