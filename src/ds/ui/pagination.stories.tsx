import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination'

/**
 * Numbered pages for server-paged views that are not tables — card grids, tiles. Replaces the live
 * kit's `Pager`. Tables draw their own footer.
 */
const meta = {
  title: 'Components/Pagination',
  component: Pagination,
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

/** Page 4 of 12: the window keeps first, last and the neighbours. */
export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#page-3" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-3">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-4" isActive>4</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-5">5</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-12">12</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#page-5" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: '4' })).toHaveAttribute('aria-current', 'page')
  },
}
