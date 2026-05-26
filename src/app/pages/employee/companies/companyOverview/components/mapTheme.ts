// Centralized Map Styling System for Opaque High-Contrast Labels and Premium Markers
export const mapStyles = `
  /* Crystal-Clear Persistent Label style */
  .google-style-label {
    background: #FFFFFF !important;
    color: #1a1a1a !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 6px !important;
    padding: 6px 12px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    letter-spacing: 0.1px !important;
    line-height: 1.3 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif !important;
    white-space: nowrap !important;
    box-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.15),
      0 2px 8px rgba(0, 0, 0, 0.08) !important;
    opacity: 1 !important;
    transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out, background-color 0.15s !important;
    z-index: 1000 !important;
  }

  .google-style-label.active {
    background: #3b82f6 !important;
    color: #ffffff !important;
    border-color: #2563eb !important;
    transform: scale(1.05) !important;
    z-index: 2000 !important;
  }

  .google-style-label.dimmed {
    opacity: 0.6 !important;
  }

  /* Connector triangle linking label to marker pin */
  .google-style-label::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: calc(50% - 6px);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid #FFFFFF !important;
  }

  .google-style-label.active::after {
    border-top-color: #3b82f6 !important;
  }

  /* Leaflet Tooltip structural override */
  .leaflet-tooltip-top.google-style-label:before {
    display: none !important;
  }

  /* ----------------------------------------------------------- */
  /* Critical Warning Marker Visibility & pulsing                */
  /* ----------------------------------------------------------- */
  .custom-warning-marker {
    background: none !important;
    border: none !important;
  }

  .warning-wrapper {
    position: relative;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #dc2626 !important;
    border: 2px solid #ffffff !important;
    border-radius: 50% !important;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4) !important;
    transition: all 0.2s ease-in-out;
  }

  .warning-wrapper .warning-icon-svg {
    width: 18px;
    height: 18px;
    fill: #ffffff !important;
  }

  .warning-wrapper::after {
    content: '';
    position: absolute;
    top: -4px; left: -4px; right: -4px; bottom: -4px;
    border-radius: 50%;
    border: 2px solid #dc2626;
    opacity: 0;
    animation: warning-pulse 2s infinite;
  }

  @keyframes warning-pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { opacity: 0.5; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .warning-wrapper::after {
      animation: none !important;
    }
  }

  /* ----------------------------------------------------------- */
  /* Collapsible User Settings Toggle Panel                      */
  /* ----------------------------------------------------------- */
  .map-control-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08) !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transition: all 200ms ease-out !important;
    overflow: hidden;
  }

  @media (max-width: 900px) {
    .map-control-panel {
      top: 80px !important;
      right: 16px !important;
    }
  }

  /* Collapsed state styling: circular 40x40px toggle button */
  .map-control-panel.collapsed {
    width: 40px !important;
    height: 40px !important;
    border-radius: 50% !important;
    padding: 0 !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Expanded state styling */
  .map-control-panel.expanded {
    width: 140px !important;
    height: 95px !important;
    border-radius: 10px !important;
    padding: 10px 14px !important;
  }

  /* Toggle Icon Button */
  .map-control-toggle-btn {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    position: relative;
    cursor: pointer;
    outline: none;
  }

  .map-control-toggle-btn .toggle-icon {
    font-size: 18px;
    line-height: 1;
  }

  /* Selected Mode Indicator Dot (appears when smart or all are selected) */
  .active-indicator-dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 6px;
    height: 6px;
    background-color: #3b82f6;
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(59, 130, 246, 0.6);
  }

  .map-control-expanded-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: 0;
    animation: fadeIn 150ms ease-out forwards;
    animation-delay: 50ms;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .map-control-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .map-control-title {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .map-control-close-btn {
    background: transparent;
    border: none;
    font-size: 16px;
    font-weight: 700;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }

  .map-control-close-btn:hover {
    color: #64748b;
  }

  .map-control-option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #334155;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }

  .map-control-option input {
    cursor: pointer;
    accent-color: #3b82f6;
    margin: 0;
  }
`;
