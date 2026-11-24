import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';

interface QrCodeViewProps {
  token: string;
  size?: number;
  label?: string;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({ token, size = 148, label }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (!token) {
      setDataUrl('');
      return;
    }
    QRCode.toDataURL(token, {
      width: size * 2,
      margin: 2,
      color: {
        dark: '#0A0A0D',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [token, size]);

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div
        className="rounded-xl bg-white p-2 border border-white/20 shadow-lg flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={label ?? `QR Pass ${token}`}
            className="w-full h-full object-contain rounded"
          />
        ) : (
          <QrCode className="w-12 h-12 text-neutral-800" />
        )}
      </div>
      <span className="text-[10px] font-mono text-white/60 tracking-wider select-all">
        {token}
      </span>
    </div>
  );
};
