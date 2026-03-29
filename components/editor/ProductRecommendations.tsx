'use client';

import type { RecommendationsTranslations } from '@/lib/translations';

const PRODUCTS = [
  { slug: 'indoor-pro', image: '/products/indoor-pro.png', price: 300 },
  { slug: 'outdoor-pro', image: '/products/outdoor-pro.png', price: 350 },
  { slug: 'doorbell', image: '/products/doorbell.png', price: 350 },
  { slug: 'kit-inicial', image: '/products/kit-home.png', price: null },
] as const;

interface Props {
  tr: RecommendationsTranslations;
}

export default function ProductRecommendations({ tr }: Props) {
  return (
    <div className="w-52 shrink-0 flex flex-col gap-2">
      <div className="mb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1a6bff]">
          {tr.title}
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">{tr.subtitle}</p>
      </div>

      {PRODUCTS.map(({ slug, image, price }) => {
        const prod = tr.products[slug as keyof typeof tr.products];
        return (
          <a
            key={slug}
            href={`/productos/${slug}`}
            onClick={(e) => { e.preventDefault(); window.location.href = `/productos/${slug}`; }}
            className="group flex gap-2.5 p-2.5 rounded-xl border border-white/8 bg-white/[0.02] hover:border-[#1a6bff]/30 hover:bg-[#1a6bff]/[0.04] transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-black flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={image}
                alt={prod.name}
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white leading-tight truncate">
                {prod.name}
              </p>
              <p className="text-[9px] text-gray-500 leading-snug mt-0.5 line-clamp-2">
                {prod.desc}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                {price && (
                  <span className="text-[10px] font-bold text-[#1a6bff]">
                    ${price}
                  </span>
                )}
                <span className="text-[9px] text-gray-600 group-hover:text-[#1a6bff] transition-colors">
                  {tr.buy} →
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
