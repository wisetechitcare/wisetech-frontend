import { useEffect, useRef, useState, ReactNode } from 'react';
import Loader from '@app/modules/common/utils/Loader';

interface LazySectionProps {
    children: ReactNode;
    placeholder?: ReactNode;
    rootMargin?: string;
    threshold?: number;
    minHeight?: string;
}

/**
 * LazySection component that uses Intersection Observer to lazy-load content
 * Only renders children when they come into viewport
 *
 * @param children - Content to lazy load
 * @param placeholder - Custom placeholder (defaults to Loader)
 * @param rootMargin - Margin around viewport for early loading (e.g., "200px")
 * @param threshold - Visibility threshold (0-1)
 * @param minHeight - Minimum height for placeholder
 */
const LazySection = ({
    children,
    placeholder,
    rootMargin = '200px',
    threshold = 0.01,
    minHeight = '300px'
}: LazySectionProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasRendered, setHasRendered] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasRendered) {
                    setIsVisible(true);
                    setHasRendered(true); // Once loaded, keep it loaded
                }
            },
            {
                rootMargin,
                threshold,
            }
        );

        const currentRef = sectionRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [rootMargin, threshold, hasRendered]);

    return (
        <div ref={sectionRef} style={{ minHeight: isVisible ? 'auto' : minHeight }}>
            {isVisible ? (
                children
            ) : (
                placeholder || <div style={{ minHeight }} />
            )}
        </div>
    );
};

export default LazySection;
