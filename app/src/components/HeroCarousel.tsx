import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { banners } from '../data/siteData';

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-play
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl group">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex-[0_0_100%] min-w-0 relative aspect-[21/9] md:aspect-[3/1]"
            >
              <img
                src={banner.image}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Text content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                {banner.tag && (
                  <span className="text-xs md:text-sm text-white/80 mb-1 font-medium">
                    {banner.tag}
                  </span>
                )}
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white text-shadow leading-tight">
                  {banner.title}
                </h2>
                <p
                  className="text-xl md:text-3xl lg:text-4xl font-extrabold text-shadow leading-tight"
                  style={{ color: '#00d4ff' }}
                >
                  {banner.subtitle}
                </p>
                {banner.date && (
                  <span className="text-xs text-white/60 mt-1">{banner.date}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all duration-300"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all duration-300"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: selectedIndex === index ? 20 : 8,
              backgroundColor: selectedIndex === index ? '#ffffff' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
