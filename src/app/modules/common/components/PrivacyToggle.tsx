import React from 'react';
import { Button } from '@/ds/ui/button';

interface PrivacyToggleProps {
    isVisible: boolean;
    onToggle: () => void;
    color?: string;
    title?: string;
}

/**
 * The eye glyph alone — no button. A control that already IS a button (the sticky tab bar's
 * Show / Hide amounts) must use this, never `PrivacyToggle`: a button inside a button is invalid,
 * and with both carrying an onClick one tap fired the toggle twice (once on the inner button,
 * once bubbling to the outer), which cancelled out. On a phone the tab bar stretches every
 * button in its action rail to the same 36px square, so the inner one covered the outer
 * completely and the eye never worked.
 */
export const PrivacyIcon: React.FC<{ isVisible: boolean; color?: string }> = ({
    isVisible,
    color = '#666',
}) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        {isVisible ? (
            <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                fill={color}
            />
        ) : (
            <>
                <path
                    d="M12 4.5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    fill={color}
                />
                <path
                    d="M3 3l18 18"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </>
        )}
    </svg>
);

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
    isVisible,
    onToggle,
    color = '#666',
    title
}) => {
    return (
        <Button variant="ghost" size="icon-sm" aria-label="Toggle sensitive data"
            onClick={onToggle}
            title={title || (isVisible ? "Hide sensitive data" : "Show sensitive data")}
        >
            <PrivacyIcon isVisible={isVisible} color={color} />
        </Button>
    );
};

export default PrivacyToggle;