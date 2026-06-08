import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  onClick?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  style,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAyNUMyMi43NjE0IDI1IDI1IDIyLjc2MTQgMjUgMjBDMjUgMTcuMjM4NiAyMi43NjE0IDE1IDIwIDE1QzE3LjIzODYgMTUgMTUgMTcuMjM4NiAxNSAyMEMxNSAyMi43NjE0IDE3LjIzODYgMjUgMjAgMjVaIiBmaWxsPSIjQ0NDQ0NDIi8+Cjwvc3ZnPgo=',
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '50px' // Start loading 50px before entering viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Preload the actual image when in view
  useEffect(() => {
    if (isInView && !hasError && currentSrc === placeholder) {
      const img = new Image();
      img.onload = () => {
        setCurrentSrc(src);
        setIsLoaded(true);
        setHasError(false);
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoaded(true); // Still consider it "loaded" to avoid blinking
      };
      img.src = src;
    }
  }, [isInView, src, placeholder, hasError, currentSrc]);

  const handleLoad = () => {
    if (currentSrc !== placeholder) {
      setIsLoaded(true);
    }
  };

  const handleError = () => {
    if (currentSrc !== placeholder) {
      setHasError(true);
      setCurrentSrc(placeholder);
    }
  };

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        opacity: 1, // Always full opacity to prevent blinking
        transition: 'none' // Remove transition to prevent blinking
      }}
      onLoad={handleLoad}
      onError={handleError}
      onClick={onClick}
      loading="lazy"
    />
  );
};

export default LazyImage;