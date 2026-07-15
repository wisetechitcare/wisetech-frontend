import { ButtonHTMLAttributes, ReactNode } from 'react';
import './PremiumButton.css';

export interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Bootstrap-icon class rendered before the label, e.g. "bi-plus". */
  icon?: string;
  /** A custom icon node (KTIcon, <svg>, <img>) rendered before the label.
   *  Use this instead of `icon` when you need a non-Bootstrap icon. */
  iconNode?: ReactNode;
  /** Size preset. "md" (default) matches the calendar "New" button. */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to the container width (handy on mobile). */
  block?: boolean;
  children: ReactNode;
}

/**
 * PremiumButton — the app's premium gradient action button ("New / Create / Add").
 * Pixel-matches the calendar toolbar's primary button. It's a drop-in <button>
 * replacement, so every native button prop (onClick, disabled, title, aria-*,
 * type, style, …) works. Extra `className` is appended, not overridden.
 *
 * @example
 *   <PremiumButton icon="bi-plus" onClick={openForm}>Create Meeting</PremiumButton>
 *   <PremiumButton iconNode={<KTIcon iconName="plus" />} size="lg" block>Add Holiday</PremiumButton>
 */
const PremiumButton = ({
  icon,
  iconNode,
  size = 'md',
  block = false,
  type = 'button',
  className = '',
  children,
  ...rest
}: PremiumButtonProps) => {
  const classes = [
    'wt-premium-btn',
    `wt-premium-btn--${size}`,
    block ? 'wt-premium-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {iconNode ?? (icon ? <i className={`bi ${icon}`} aria-hidden="true" /> : null)}
      {children}
    </button>
  );
};

export default PremiumButton;
