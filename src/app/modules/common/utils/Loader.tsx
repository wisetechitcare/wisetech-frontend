/**
 * Legacy import path for the page/section loading placeholder.
 * Implementation lives in the kit as `PageLoader` — keep this re-export so
 * existing `@app/modules/common/utils/Loader` imports stay stable.
 */
export { PageLoader as default, PageLoader } from '@app/modules/common/components/ui/PageLoader';
export type { PageLoaderProps } from '@app/modules/common/components/ui/PageLoader';
