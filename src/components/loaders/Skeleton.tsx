import React from 'react';
import './Skeleton.scss';

/**
 * GENERIC BASE SKELETON COMPONENT
 * 
 * Purpose: Provides a reusable, animated shimmer box for loading states.
 * 
 * Props:
 * - width: CSS width (default 100%)
 * - height: CSS height (default 16px)
 * - borderRadius: CSS border radius (default 6px)
 * - className: additional CSS classes
 * - onTinted: set to true when used on colored backgrounds (increases contrast)
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
  onTinted?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "16px",
  borderRadius = "6px",
  className = "",
  style = {},
  onTinted = false,
}) => {
  const combinedStyle: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
    ...style,
  };

  return (
    <div 
      className={`skeleton-base ${onTinted ? 'on-tinted' : ''} ${className}`} 
      style={combinedStyle} 
    />
  );
};

export default Skeleton;
