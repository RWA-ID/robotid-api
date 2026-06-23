'use client';

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
  type CSSProperties,
} from 'react';

/** scroll-driven reveal: fades + translates content in when scrolled into view.
 *  Respects prefers-reduced-motion (shows instantly). SSG-safe: server and first
 *  client render both start hidden-then-revealed only after mount. */
function prefersReduced() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

type RevealProps = {
  children?: ReactNode;
  as?: ElementType;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
};

export function Reveal({
  children,
  as,
  delay = 0,
  y = 22,
  className = '',
  style,
  ...rest
}: RevealProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (prefersReduced()) {
      setSeen(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const merged: CSSProperties = {
    opacity: seen ? 1 : 0,
    transform: seen ? 'none' : `translate3d(0, ${y}px, 0)`,
    transition: `opacity .7s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
    willChange: 'opacity, transform',
    ...style,
  };

  return (
    <Tag ref={ref} className={className} style={merged} {...rest}>
      {children}
    </Tag>
  );
}

/** Section header block used across every section (eyebrow tag + h2 + lede). */
export function SecHead({
  num,
  tag,
  h,
  children,
}: {
  num: string;
  tag: string;
  h: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="sechead">
      <Reveal as="div" className="sec-tag">
        <span className="num">{num}</span> {tag}
      </Reveal>
      <Reveal as="h2" className="sec-h" delay={60}>
        {h}
      </Reveal>
      {children && (
        <Reveal as="p" className="sec-lede" delay={120}>
          {children}
        </Reveal>
      )}
    </div>
  );
}

/** very subtle parallax: shifts an element by a fraction of scroll while in view */
export function useParallax(strength = 0.06) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (prefersReduced()) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2 - window.innerHeight / 2;
        el.style.transform = `translate3d(0, ${(-mid * strength).toFixed(1)}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [strength]);
  return ref;
}
