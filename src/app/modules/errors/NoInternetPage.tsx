import React, { useEffect, useState } from 'react';

// No Internet page – visually aligned with MaintenancePage
export const NoInternetPage: React.FC = () => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setIsRetrying(false);
      }
    }, 800);
  };

  // Auto‑reload when back online
  useEffect(() => {
    const handleOnline = () => window.location.reload();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div
      className="d-flex flex-column flex-root min-vh-100 position-fixed top-0 start-0 w-100 overflow-hidden"
      style={{
        zIndex: 99999,
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #fff1f2 100%)',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          left: '-120px',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.12)',
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          right: '-120px',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'rgba(244,63,94,0.10)',
          filter: 'blur(80px)',
        }}
      />

      <div className="d-flex flex-column flex-center flex-column-fluid px-5 py-10 position-relative">
        {/* Card */}
        <div
          className="bg-white shadow-lg rounded-4 p-10 text-center position-relative overflow-hidden"
          style={{
            maxWidth: '620px',
            width: '100%',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
          }}
        >
          {/* Status badge */}
          <div className="mb-7">
            <span
              className="badge px-5 py-3 fs-7 fw-bold"
              style={{
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '999px',
              }}
            >
              ● No Internet Connection
            </span>
          </div>

          {/* Icon Illustration */}
          <div className="mb-8 d-flex justify-content-center">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle position-relative"
              style={{
                width: '140px',
                height: '140px',
                background: 'linear-gradient(135deg, #fee2e2, #fef2f2)',
                boxShadow: '0 10px 30px rgba(239,68,68,0.15)',
              }}
            >
              {/* Pulse */}
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px solid rgba(239,68,68,0.15)',
                  animation: 'pulseMaintenance 2s infinite',
                }}
              />
              <svg
                width="70"
                height="70"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                  fill="#EF4444"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="fw-bolder text-gray-900 mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '-0.03em' }}>
            No Internet Connection
          </h1>

          {/* Description */}
          <p className="text-gray-600 fw-semibold mb-8 mx-auto" style={{ maxWidth: '480px', fontSize: '1.05rem', lineHeight: 1.8 }}>
            Please check your network settings and ensure you are connected to the internet. The application will automatically refresh once the connection is restored.
          </p>

          {/* Info Box – similar to MaintenancePage */}
          <div className="rounded-3 p-5 mb-8 text-start" style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}>
            <div className="d-flex align-items-start">
              <div className="me-4 d-flex align-items-center justify-center rounded-circle" style={{
                minWidth: '40px',
                height: '40px',
                background: '#EEF2FF',
              }}>
                📶
              </div>
              <div>
                <div className="fw-bold text-gray-800 mb-1">Network Issue</div>
                <div className="text-gray-600 fs-7">Your device appears offline. Please check your connection.</div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="btn fw-bold px-8 py-4 rounded-3"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              color: '#fff',
              border: 'none',
              minWidth: '220px',
              fontSize: '15px',
              boxShadow: '0 10px 25px rgba(37,99,235,0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            {isRetrying ? (
              <span className="indicator-progress" style={{ display: 'block' }}>
                Checking... <span className="spinner-border spinner-border-sm align-middle ms-2" />
              </span>
            ) : (
              'Retry Connection'
            )}
          </button>

          <div className="text-muted fs-8 mt-5">Thank you for your patience</div>
        </div>
      </div>

      {/* animation */}
      <style>{`\n        @keyframes pulseMaintenance {\n          0% { transform: scale(1); opacity: 1; }\n          100% { transform: scale(1.35); opacity: 0; }\n        }\n      `}</style>
    </div>
  );
};
