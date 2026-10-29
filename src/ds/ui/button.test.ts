import { describe, expect, it } from 'vitest';
import { buttonVariants } from './button';

// Links that look like buttons use buttonVariants() directly. Its classes must already be conflict-free:
// cva alone kept the base's border-transparent / text-sm beside the variant's border colour and the size's
// text size, and the later Tailwind rule won — every "View all" link lost its outline border.
describe('buttonVariants (links styled as buttons)', () => {
  it('the variant border colour replaces the base transparent border', () => {
    const cls = buttonVariants({ variant: 'outline', size: 'sm' }).split(' ');
    expect(cls).toContain('border-slate-300');
    expect(cls).not.toContain('border-transparent');
  });

  it('the size text size replaces the base text-sm', () => {
    const cls = buttonVariants({ size: 'default' }).split(' ');
    expect(cls).toContain('text-[13.5px]');
    expect(cls).not.toContain('text-sm');
  });

  it('a caller className still merges last', () => {
    expect(buttonVariants({ variant: 'outline', className: 'w-full' }).split(' ')).toContain('w-full');
  });
});
