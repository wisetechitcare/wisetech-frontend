import { useEffect } from 'react';

/**
 * Where Google sends the popup back to.
 *
 * This page exists only to hand the one-time `code` to the window that opened it and then get
 * out of the way. It renders a line of text, holds no state, calls no API and never sees a
 * token — the exchange happens on the backend, which is the only place the client secret lives.
 *
 * ─── WHY A ROUTE AND NOT A BACKEND REDIRECT ──────────────────────────────────────────
 * The alternative is a backend callback that returns an HTML page which posts the message. That
 * means the API server generating markup for the browser, which it does nowhere else in this
 * product. A route the frontend already knows how to serve costs one component.
 *
 * Deliberately mounted OUTSIDE the authentication gate. The popup carries the session cookie
 * like any other tab, but a gated route can lose a race with the session check and redirect the
 * popup to /auth — at which point the code is gone and the admin sees a login screen in a
 * window they did not expect one in. There is nothing to protect here: the page reads two
 * values out of its own URL and passes them to its own opener.
 */
export const GoogleContactsCallback = () => {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payload = {
            source: 'wisetech-google-contacts',
            code: params.get('code'),
            state: params.get('state'),
            // Google sends `error=access_denied` when somebody declines. That is a normal
            // outcome, not a failure — the dialog says so rather than showing a red box.
            error: params.get('error'),
        };

        // Targeted at OUR origin, never '*': a wildcard would post the authorization code to
        // whatever page happened to open this one.
        window.opener?.postMessage(payload, window.location.origin);
        window.close();
    }, []);

    return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
            Finishing Google authorization — you can close this window.
        </div>
    );
};

export default GoogleContactsCallback;
