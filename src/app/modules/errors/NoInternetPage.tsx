import React, { useEffect, useState } from 'react'

const NoInternetPage: React.FC = () => {
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
  }

  // Optional: Automatically reload when back online
  useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div className="d-flex flex-column flex-root w-100 h-100 bg-white" style={{ position: 'fixed', top: 0, left: 0, zIndex: 99999 }}>
      <div className="d-flex flex-column flex-center flex-column-fluid p-10">
        <div className="mb-10 text-center">
          <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C7.95 3 4.21 4.34 1.2 6.6L3 9C5.5 7.12 8.62 6 12 6C15.38 6 18.5 7.12 21 9L22.8 6.6C19.79 4.34 16.05 3 12 3ZM7.46 11.88L9.26 14.28C10.04 13.79 10.98 13.5 12 13.5C13.02 13.5 13.96 13.79 14.74 14.28L16.54 11.88C15.24 11 13.68 10.5 12 10.5C10.32 10.5 8.76 11 7.46 11.88ZM12 15C11.17 15 10.5 15.67 10.5 16.5C10.5 17.33 11.17 18 12 18C12.83 18 13.5 17.33 13.5 16.5C13.5 15.67 12.83 15 12 15Z" fill="#FFA800" />
            <path d="M2.93 2.93L21.07 21.07L19.66 22.48L17.5 20.32C16.94 20.73 16.29 21.07 15.61 21.32L14.7 18.49C15.09 18.36 15.45 18.17 15.78 17.94L13.8 15.96C13.25 16.29 12.65 16.5 12 16.5C11.17 16.5 10.5 15.83 10.5 15C10.5 14.78 10.56 14.58 10.65 14.4L8.7 12.45C7.94 12.92 7.29 13.51 6.77 14.19L5.34 12.76C6.1 11.88 7.01 11.12 8.04 10.53L6.1 8.59C4.85 9.4 3.75 10.4 2.84 11.55L1.4 10.11C2.53 8.7 3.86 7.46 5.38 6.45L1.51 2.58L2.93 2.93Z" fill="#FFA800" />
          </svg>
        </div>

        <h1 className="fw-bolder fs-2hx text-gray-900 mb-4 text-center">
          No Internet Connection
        </h1>

        <div className="fw-semibold fs-5 text-gray-500 mb-10 text-center" style={{ maxWidth: '500px' }}>
          Please check your network settings and make sure you are connected to the internet. We will reconnect you automatically once the network is restored.
        </div>

        <div className="text-center">
          <button 
            onClick={handleRetry} 
            disabled={isRetrying}
            className="btn btn-warning text-white"
            style={{ borderRadius: '8px', padding: '12px 24px', fontWeight: 600 }}
          >
            {isRetrying ? (
              <span className="indicator-progress" style={{ display: 'block' }}>
                Please wait... <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
              </span>
            ) : (
              'Retry Connection'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export { NoInternetPage }
