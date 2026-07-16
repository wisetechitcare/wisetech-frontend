import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchCompanyLogo } from "@services/company";

const DEFAULT_LOGO =
  "https://wise-tech-asset-store.s3.ap-south-1.amazonaws.com/4100960a0f2c5e89381847e6637d3e67aa43d39330";

/**
 * Shown when an inactive / exited employee tries to sign in. The login gate
 * (backend) rejects them with meta.code === 'ACCOUNT_INACTIVE' and the Login
 * form routes here instead of showing an inline error. A short, friendly
 * dead-end that points them to HR — no way back into the app without HR
 * reactivating the account.
 */
export default function InactiveEmployee() {
  const navigate = useNavigate();
  const location = useLocation();
  const message =
    (location.state as { message?: string } | null)?.message ||
    "You're currently marked as an inactive employee. Please connect with HR to restore your access.";

  const [logoSrc, setLogoSrc] = useState(DEFAULT_LOGO);

  useEffect(() => {
    async function getCompanyLogo() {
      try {
        const { data: { logo } } = await fetchCompanyLogo();
        if (logo) setLogoSrc(logo); // keep default if no logo is set
      } catch { /* keep default logo */ }
    }
    getCompanyLogo();
  }, []);

  return (
    <div
      className="d-flex flex-column flex-column-fluid min-vh-100 align-items-center justify-content-center p-5"
      style={{
        background: "linear-gradient(135deg, #f3f4f6 0%, #e2e8f0 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        className="d-flex flex-column align-items-center text-center p-10 p-lg-15 w-100"
        style={{
          maxWidth: 480,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: 24,
          boxShadow:
            "0 20px 40px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            minHeight: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <img
            src={logoSrc}
            alt="Company Logo"
            style={{ maxHeight: 100, maxWidth: 300, objectFit: "contain" }}
            onError={(e) => {
              if (e.currentTarget.src !== DEFAULT_LOGO)
                e.currentTarget.src = DEFAULT_LOGO;
            }}
          />
        </div>

        {/* Status Icon */}
        <div
          className="d-flex align-items-center justify-content-center rounded-circle mb-8"
          style={{
            width: 96,
            height: 96,
            background: "linear-gradient(135deg, #fff1f3 0%, #ffe4e8 100%)",
            boxShadow: "0 8px 16px rgba(241, 65, 108, 0.15)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              border: "2px dashed rgba(241, 65, 108, 0.3)",
              borderRadius: "50%",
              animation: "spin 12s linear infinite",
            }}
          ></div>
          <i
            className="bi bi-person-fill-slash"
            style={{ fontSize: 44, color: "#f1416c", zIndex: 1 }}
          />
        </div>

        <h1
          className="fw-bolder mb-3"
          style={{
            fontSize: 32,
            color: "#1e293b",
            letterSpacing: "-0.5px",
          }}
        >
          Account Inactive
        </h1>

        <p
          className="fw-medium mb-8"
          style={{
            fontSize: 16,
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <div
          className="d-flex align-items-center gap-4 rounded-4 px-6 py-4 mb-10 w-100 text-start"
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 48,
              height: 48,
              background: "#eff6ff",
              flexShrink: 0,
            }}
          >
            <i className="bi bi-envelope-paper-heart-fill text-primary fs-3" />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 2,
              }}
            >
              Next Steps
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>
              Reach out to your HR department for assistance.
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => navigate("/auth", { replace: true })}
          style={{
            background: "#1e293b",
            color: "#fff",
            borderRadius: 12,
            padding: "14px 20px",
            fontSize: 15,
            fontWeight: 600,
            transition: "all 0.2s ease",
            boxShadow: "0 4px 6px rgba(30, 41, 59, 0.2)",
            border: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#0f172a";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 12px rgba(30, 41, 59, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1e293b";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(30, 41, 59, 0.2)";
          }}
        >
          <i className="bi bi-arrow-left" style={{ fontSize: 18 }} />
          Back to Login
        </button>

        <style>{`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
