import { FC } from 'react';
import { useLayout } from '../../../core/LayoutProvider';
import { usePageData } from '../../../core/PageData';

const PageHeadingTitle: FC = () => {
  const { pageTitle, pageDescription } = usePageData();
  const { config } = useLayout();

  return (
    pageTitle && (
      <div className='page-title-heading d-flex flex-column text-gray-900 fw-bolder fs-3 mb-0'>
        {pageTitle}
        {pageDescription && config.pageTitle && config.pageTitle.description && (
          <>
            <span className='h-20px border-gray-200 border-start ms-3 mx-2'></span>
            <small className='text-muted fs-7 fw-bold my-1 ms-1'>{pageDescription}</small>
          </>
        )}
      </div>
    )
  );
};

export { PageHeadingTitle };
