import { Award } from 'lucide-react';

interface HotelHeroProps {
  hotelName: string;
  address?: string;
}

export function HotelHero({ hotelName, address }: HotelHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1b2d] via-[#162240] to-[#1a2744] px-6 py-12 text-center ring-1 ring-gold/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,168,76,0.08)_0%,_transparent_70%)]" />
      <div className="relative">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
          <Award className="h-6 w-6 text-gold" />
        </div>
        <h1 className="text-2xl font-bold text-white">{hotelName}</h1>
        {address && <p className="mt-1 text-sm text-white/60">{address}</p>}
        <p className="mt-3 text-sm text-gold/80">Leave a tip for your room&apos;s cleaning staff</p>
      </div>
    </div>
  );
}
