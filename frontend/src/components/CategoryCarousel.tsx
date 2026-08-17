import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../lib/format';

export interface CarouselItem {
  id: string;
  name: string;
  subtitle?: string;
  price?: number;
  imageUrl?: string;
  disabled?: boolean;
  ctaLabel: string;
  onCta: () => void;
  featured?: boolean;
}

interface CategoryCarouselProps {
  title: string;
  items: CarouselItem[];
  autoplay?: boolean;
  autoplayIntervalMs?: number;
}

function CarouselCard({ item }: { item: CarouselItem }) {
  const [loaded, setLoaded] = useState(!item.imageUrl);

  return (
    <div className={item.featured ? 'carousel-card carousel-card-featured' : 'carousel-card'}>
      <div className="carousel-card-media">
        {item.imageUrl ? (
          <>
            {!loaded && <div className="carousel-card-skeleton" aria-hidden="true" />}
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              className={loaded ? 'carousel-card-image loaded' : 'carousel-card-image'}
            />
          </>
        ) : (
          <div className="carousel-card-media-empty">Sin imagen</div>
        )}
        <div className="carousel-card-overlay">
          {item.price !== undefined && <span className="carousel-card-overlay-price">{formatCurrency(item.price)}</span>}
          <button type="button" disabled={item.disabled} onClick={item.onCta}>
            {item.ctaLabel}
          </button>
        </div>
      </div>
      <h3>{item.name}</h3>
      {item.subtitle && <p className="text-muted">{item.subtitle}</p>}
      {item.price !== undefined && <p className="carousel-card-price">{formatCurrency(item.price)}</p>}
      <button type="button" disabled={item.disabled} onClick={item.onCta} className="carousel-card-cta">
        {item.ctaLabel}
      </button>
    </div>
  );
}

export function CategoryCarousel({ title, items, autoplay = false, autoplayIntervalMs = 4000 }: CategoryCarouselProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || items.length <= 1) return;
    const interval = setInterval(() => {
      const track = trackRef.current;
      if (!track || pausedRef.current) return;
      const card = track.querySelector<HTMLElement>('.carousel-card');
      const step = card ? card.offsetWidth + 12 : track.clientWidth;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: 'smooth' });
    }, autoplayIntervalMs);
    return () => clearInterval(interval);
  }, [autoplay, autoplayIntervalMs, items.length]);

  function scrollByStep(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('.carousel-card');
    const step = card ? card.offsetWidth + 12 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: 'smooth' });
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('.carousel-card');
    const step = card ? card.offsetWidth + 12 : track.clientWidth;
    setActiveDot(Math.round(track.scrollLeft / step));
  }

  const dotsCount = items.length;

  return (
    <section
      ref={sectionRef}
      className={inView ? 'carousel-section in-view' : 'carousel-section'}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
    >
      <div className="carousel-header">
        <h2>{title}</h2>
        <div className="carousel-arrows">
          <button type="button" aria-label="Anterior" onClick={() => scrollByStep(-1)}>
            &#8249;
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => scrollByStep(1)}>
            &#8250;
          </button>
        </div>
      </div>

      <div className="carousel-track" ref={trackRef} onScroll={handleScroll}>
        {items.map((item) => (
          <CarouselCard key={item.id} item={item} />
        ))}
      </div>

      {dotsCount > 1 && (
        <div className="carousel-dots">
          {items.map((item, index) => (
            <span key={item.id} className={index === activeDot ? 'carousel-dot active' : 'carousel-dot'} />
          ))}
        </div>
      )}
    </section>
  );
}
