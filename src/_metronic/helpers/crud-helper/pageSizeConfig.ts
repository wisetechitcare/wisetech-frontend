// Every table's "Rows per page" choices. Capped at 50: past that a page renders slowly (each
// row is a full set of cells, chips and inputs) for no gain a scroll or the search can't give.
// Exports fetch their own rows, so they are not limited by this.
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number]
export const DEFAULT_PAGE_SIZE: PageSizeOption = 10
export const MAX_PAGE_SIZE = 50
