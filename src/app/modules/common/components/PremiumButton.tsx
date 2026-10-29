import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from '@/ds/ui/button';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { KT_ICON_FULL } from '@app/modules/common/components/ui/buttons';

export interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Bootstrap-icon class rendered before the label, e.g. "bi-plus". */
  icon?: string;
  /** A custom icon node (KTIcon, <svg>, <img>) rendered before the label.
   *  Use this instead of `icon` when you need a non-Bootstrap icon. */
  iconNode?: ReactNode;
  /** Size preset: sm, md (default) or lg. */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to the container width (handy on mobile). */
  block?: boolean;
  children: ReactNode;
}

const KIT_SIZE = { sm: 'sm', md: 'default', lg: 'lg' } as const;

/**
 * PremiumButton — the "New / Create / Add" action. Same API as before; it renders the v2 kit
 * Button's `default` variant (src/ds/ui/button.tsx), so it looks like every other main action.
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
  const glyph = iconNode ?? (icon ? <AppIcon name={icon} aria-hidden="true" /> : null);
  return (
    <Button type={type} size={KIT_SIZE[size]} className={cn(KT_ICON_FULL, block && 'w-full', className)} {...rest}>
      {glyph && <span data-icon="inline-start" className="inline-flex">{glyph}</span>}
      {children}
    </Button>
  );
};

export default PremiumButton;
