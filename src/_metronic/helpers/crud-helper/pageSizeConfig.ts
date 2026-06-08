export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500, 1000] as const
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number]
export const DEFAULT_PAGE_SIZE: PageSizeOption = 10
export const MAX_PAGE_SIZE = 1000
