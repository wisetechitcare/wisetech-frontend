import React from 'react';
import { Link } from 'react-router-dom';
import { MediaBreadcrumbItem } from '@models/media';

interface MediaBreadcrumbProps {
    items: MediaBreadcrumbItem[];
    showBackButton?: boolean;
}

const MediaBreadcrumb: React.FC<MediaBreadcrumbProps> = ({ items, showBackButton = false }) => {
    return (
        <div className="d-flex align-items-center mb-4 mb-md-5">
            <nav aria-label="breadcrumb" className="w-100">
                <ol className="breadcrumb mb-0 flex-wrap">
                    {items.map((item, index) => (
                        <li
                            key={index}
                            className={`breadcrumb-item fs-7 fs-sm-6 ${item.isActive ? 'active' : ''}`}
                            {...(item.isActive && { 'aria-current': 'page' })}
                        >
                            {item.path ? (
                                <Link to={item.path} className="text-primary text-hover-primary d-flex align-items-center">
                                    {index === 0 && showBackButton && (
                                        <i className="ki-duotone ki-left fs-4 fs-sm-3 me-1 me-sm-2"></i>
                                    )}
                                    <span className="text-break">{item.label}</span>
                                </Link>
                            ) : (
                                <span className="text-break">{item.label}</span>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </div>
    );
};

export default MediaBreadcrumb;
