import { Award } from 'lucide-react';

interface HotelHeroProps {
  hotelName: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function HotelHero({
  hotelName,
  address,
  logoUrl,
  primaryColor,
  secondaryColor,
}: HotelHeroProps) {
  const hasBranding = !!(logoUrl || primaryColor);
  const bgFrom = primaryColor || '#0f1b2d';
  const bgVia = secondaryColor || primaryColor ? `${primaryColor || '#162240'}cc` : '#162240';
  const bgTo = secondaryColor || '#1a2744';
  const textColor = primaryColor && getLuminance(primaryColor) > 0.4 ? '#1a1a1a' : '#ffffff';
  const subtextOpacity = textColor === '#1a1a1a' ? '0.6' : '0.6';

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-6 py-12 text-center ring-1 ring-gold/10"
      style={{
        background: `linear-gradient(to bottom right, ${bgFrom}, ${bgVia}, ${bgTo})`,
      }}
    >
      {!primaryColor && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,168,76,0.08)_0%,_transparent_70%)]" />
      )}
      <div className="relative">
        {logoUrl ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <img
              src={logoUrl}
              alt={`${hotelName} logo`}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20"
            />
          </div>
        ) : (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
            <Award className="h-6 w-6 text-gold" />
          </div>
        )}
        <h1 className="text-2xl font-bold" style={{ color: textColor }}>
          {hotelName}
        </h1>
        {address && (
          <p className="mt-1 text-sm" style={{ color: textColor, opacity: Number(subtextOpacity) }}>
            {address}
          </p>
        )}
        <p
          className={`mt-3 text-sm ${!hasBranding ? 'text-gold/80' : ''}`}
          style={hasBranding ? { color: textColor, opacity: 0.7 } : undefined}
        >
          Leave a tip for your room&apos;s cleaning staff
        </p>
      </div>
    </div>
  );
}
