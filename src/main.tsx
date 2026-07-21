// ── Node.js polyfills — must be first, before any library that needs Buffer ──
import { Buffer } from 'buffer'
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

import { createRoot } from 'react-dom/client'
// Axios
import axios from 'axios'
import { Chart, registerables } from 'chart.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { store } from '@redux/store'
import "./main.css"
// Apps
import { MetronicI18nProvider } from './_metronic/i18n/Metronici18n'
import './_metronic/assets/sass/style.react.scss'
// KTIcon renders duotone glyphs only (runtime default). The outline/solid
// keenicons fonts and the fonticon set were imported but never rendered any
// icon in the app, so their folders + imports were removed to trim ~3.4MB.
import './_metronic/assets/keenicons/duotone/style.css'
// import PauseCircleIcon from "@mui/icons-material/PauseCircle";
/**
 * TIP: Replace this style import with rtl styles to enable rtl mode
 *
 * import './_metronic/assets/css/style.rtl.css'
 **/
import './_metronic/assets/sass/style.scss'
import { AppRoutes } from './app/routing/AppRoutes'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { getAuth, setupAxios } from './app/modules/auth'
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { fetchCurrentUser } from '@services/users'
import { saveCurrentUser } from '@redux/slices/auth'
import { jwtDecode } from "jwt-decode"
// import Notification from "../src/app/pages/employee/tasks/components/notification/Notifications"
// import { useState } from 'react'
/**
 * Creates `axios-mock-adapter` instance for provided `axios` instance, add
 * basic Metronic mocks and returns it.
 *
 * @see https://github.com/ctimmerm/axios-mock-adapter
 */
/**
 * Inject Metronic interceptors for axios.
 *
 * @see https://github.com/axios/axios#interceptors
 */
setupAxios(axios)
Chart.register(...registerables)

// Sensible defaults so React Query caches/dedupes instead of refetching on every mount
// or window focus (the previous default of staleTime:0 made cached data instantly stale).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // treat data fresh for 5 min
      gcTime: 60 * 60 * 1000,          // keep in cache 1 hour
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const ls = localStorage.getItem("wise_tech_login")
const parsedLs = ls ? JSON.parse(ls) : null
const container = document.getElementById('root')
const currentUser = getAuth();

// Sessions started after the httpOnly-cookie migration have no token in
// localStorage — the cookie carries auth and the server validates it on the
// bootstrap calls below. Only legacy (pre-cookie) sessions still persist a
// readable token, so the client-side expiry check applies to them alone.
const hasLegacyToken = Boolean(currentUser?.token);
let isTokenExpired = false;
if (hasLegacyToken) {
  const decodedToken = jwtDecode(currentUser.token);

  if (decodedToken.iat && decodedToken.exp) {
    const currentTime = Math.floor(Date.now() / 1000);
    isTokenExpired = currentTime > decodedToken.exp;
  }
}

const renderApp = () => {
  if (!container) return
  createRoot(container).render(
    <QueryClientProvider client={queryClient}>
      <MetronicI18nProvider>
        <Provider store={store}>
          <AppRoutes />
        </Provider>
      </MetronicI18nProvider>
      <ToastContainer position="top-right" theme="light" />
    </QueryClientProvider>
  )
}

// A bootstrap failure must NOT destroy the session. The backend being down or
// restarting (connection refused, 502/503, timeout) is transient — wiping
// localStorage here is what logged everyone out whenever the backend (or both
// apps together) restarted. A DEFINITIVE session-death 401 is already handled
// by the axios interceptor (removeAuth + redirect to /auth), so after a
// failure we check whether the session is still in storage to tell the two
// apart — the serialized thunk error carries no response/status to inspect.
const BOOTSTRAP_RETRIES = 3

// ── Shared inline styles injected once ────────────────────────────────────────
const SPLASH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{overflow:hidden}
  @keyframes wt-spin   { to{transform:rotate(360deg)} }
  @keyframes wt-fadein { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes wt-dot    { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
  @keyframes wt-bar    { from{width:0%} to{width:var(--bar-w)} }
  @keyframes wt-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes wt-glow   { 0%,100%{box-shadow:0 0 0 0 rgba(59,79,216,.4)} 50%{box-shadow:0 0 0 18px rgba(59,79,216,0)} }
  @keyframes wt-shimmer{ 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  .wt-root{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:100vh;width:100%;
    background:radial-gradient(ellipse 80% 60% at 50% 30%,#dde3ff 0%,#f0f2ff 50%,#eef0f8 100%);
    font-family:'Inter',system-ui,sans-serif;
    animation:wt-fadein .6s cubic-bezier(.22,1,.36,1) both;
    position:relative;overflow:hidden;
  }
  /* decorative blobs */
  .wt-blob{position:absolute;border-radius:50%;filter:blur(80px);opacity:.35;pointer-events:none}
  .wt-blob-a{width:480px;height:480px;background:#c7d2fe;top:-100px;right:-120px}
  .wt-blob-b{width:360px;height:360px;background:#a5b4fc;bottom:-80px;left:-100px}

  /* logo card */
  .wt-logo{
    width:88px;height:88px;border-radius:26px;
    background:linear-gradient(145deg,#2238c8 0%,#4f63e8 60%,#7a8ff7 100%);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 20px 60px rgba(34,56,200,.45),0 4px 16px rgba(34,56,200,.3);
    animation:wt-float 3s ease-in-out infinite,wt-glow 3s ease-in-out infinite;
    margin-bottom:36px;flex-shrink:0;
  }
  /* spinner */
  .wt-spinner{
    width:64px;height:64px;border-radius:50%;
    border:5px solid rgba(79,99,232,.15);
    border-top-color:#4f63e8;
    animation:wt-spin .85s linear infinite;
    margin-bottom:32px;
  }
  /* dots */
  .wt-dots{display:flex;gap:6px;align-items:center;margin-bottom:10px}
  .wt-dot{width:8px;height:8px;border-radius:50%;background:#4f63e8;animation:wt-dot 1.4s ease-in-out infinite}
  .wt-dot:nth-child(1){animation-delay:0s}
  .wt-dot:nth-child(2){animation-delay:.16s}
  .wt-dot:nth-child(3){animation-delay:.32s}
  /* progress */
  .wt-track{width:320px;height:7px;background:rgba(79,99,232,.15);border-radius:999px;overflow:hidden;margin-top:28px}
  .wt-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#3246e0,#7a8ff7,#3246e0);background-size:200% 100%;animation:wt-bar .7s cubic-bezier(.22,1,.36,1) both,wt-shimmer 2s linear infinite}

  /* ── Failure page extras ── */
  .wt-card{
    background:rgba(255,255,255,.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,.7);border-radius:24px;
    padding:28px 32px;width:320px;
    box-shadow:0 8px 32px rgba(34,56,200,.1);
  }
  .wt-contact-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(79,99,232,.1)}
  .wt-contact-row:last-child{border-bottom:none}
  .wt-icon-wrap{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#eef0fd,#dde3ff);
                display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .wt-retry{
    display:inline-flex;align-items:center;gap:8px;padding:12px 32px;
    background:linear-gradient(135deg,#2238c8,#4f63e8);color:#fff;
    border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;
    box-shadow:0 6px 24px rgba(34,56,200,.35);transition:all .2s;margin-top:24px;
    font-family:'Inter',system-ui,sans-serif;
  }
  .wt-retry:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(34,56,200,.45)}
  .wt-retry:active{transform:translateY(0)}
`;

const showConnectingSplash = (attempt: number) => {
  if (!container) return;
  const pct = Math.round((attempt / BOOTSTRAP_RETRIES) * 100);
  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{overflow:hidden}
      @keyframes wt-spin   { to{transform:rotate(360deg)} }
      @keyframes wt-fadein { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes wt-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes wt-glow   { 0%,100%{box-shadow:0 20px 60px rgba(34,56,200,.45),0 4px 16px rgba(34,56,200,.3)}
                              50%{box-shadow:0 24px 70px rgba(34,56,200,.6),0 4px 16px rgba(34,56,200,.4)} }
      @keyframes wt-dot    { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
      @keyframes wt-bar    { from{width:0%} to{width:${pct}%} }
      @keyframes wt-shimmer{ 0%{background-position:-400px 0} 100%{background-position:400px 0} }

      .wt-conn-bg{
        min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;
        background:#e8eaf6;font-family:'Inter',system-ui,sans-serif;padding:24px;
      }
      .wt-conn-card{
        background:#fff;border-radius:32px;
        box-shadow:0 8px 60px rgba(0,0,0,.12);
        width:100%;max-width:480px;padding:52px 48px 44px;
        display:flex;flex-direction:column;align-items:center;text-align:center;
        animation:wt-fadein .6s cubic-bezier(.22,1,.36,1) both;
      }
      /* brand logo circle */
      .wt-conn-brand{
        display:flex;align-items:center;justify-content:center;
        margin-bottom:12px;
      }
      /* floating blue logo icon */
      .wt-conn-icon{
        width:88px;height:88px;border-radius:26px;
        background:linear-gradient(145deg,#2238c8 0%,#4f63e8 60%,#7a8ff7 100%);
        display:flex;align-items:center;justify-content:center;
        animation:wt-float 3s ease-in-out infinite, wt-glow 3s ease-in-out infinite;
        margin:24px 0 26px;flex-shrink:0;
      }
      /* spinner ring */
      .wt-conn-spin{
        width:64px;height:64px;border-radius:50%;
        border:5px solid rgba(79,99,232,.15);
        border-top-color:#4f63e8;
        animation:wt-spin .85s linear infinite;
        margin-bottom:28px;
      }
      /* dots */
      .wt-dots{display:flex;gap:7px;align-items:center;margin:14px 0 4px}
      .wt-dot{width:8px;height:8px;border-radius:50%;background:#4f63e8;animation:wt-dot 1.4s ease-in-out infinite}
      .wt-dot:nth-child(1){animation-delay:0s}
      .wt-dot:nth-child(2){animation-delay:.16s}
      .wt-dot:nth-child(3){animation-delay:.32s}
      /* progress */
      .wt-conn-track{width:100%;height:7px;background:rgba(79,99,232,.12);border-radius:999px;overflow:hidden;margin-top:22px}
      .wt-conn-fill{height:100%;border-radius:999px;
        background:linear-gradient(90deg,#3246e0,#7a8ff7,#3246e0);
        background-size:200% 100%;
        animation:wt-bar .7s cubic-bezier(.22,1,.36,1) both, wt-shimmer 2s linear infinite;
        width:${pct}%}
      /* step pills */
      .wt-steps{display:flex;gap:8px;margin-top:20px}
      .wt-step{
        height:5px;border-radius:999px;flex:1;
        transition:background .4s;
      }
    </style>

    <div class="wt-conn-bg">
      <div class="wt-conn-card">

        <!-- Brand Logo -->
        <div class="wt-conn-brand">
          <img src="/WT-logo.ico" alt="WiseTech Logo" style="width:72px;height:72px;object-fit:contain" onerror="this.style.display='none'"/>
        </div>
        <p style="font-size:11px;font-weight:800;letter-spacing:2px;color:#546e7a;text-transform:uppercase;margin-bottom:0">
          MEP CONSULTANTS PVT. LTD.
        </p>

        <!-- Floating app icon -->
        <div class="wt-conn-icon" style="width:100px;height:100px;border-radius:28px;margin:24px 0 28px">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- Spinner -->
        <div class="wt-conn-spin"></div>

        <!-- Title -->
        <h1 style="font-size:24px;font-weight:800;color:#1a237e;letter-spacing:-.4px;margin-bottom:10px">
          Reconnecting to WiseTech
        </h1>
        <p style="font-size:15px;color:#6b7280;line-height:1.65;max-width:340px;margin-bottom:12px">
          The server is starting up. Please wait…
        </p>

      </div>
    </div>
  `;
};

const showFailedSplash = () => {
  if (!container) return;
  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{overflow:hidden}
      @keyframes wt-fadein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes wt-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      @keyframes wt-pulse-ring{0%{transform:scale(.95);opacity:.8}70%{transform:scale(1.05);opacity:.4}100%{transform:scale(.95);opacity:.8}}
      .wt-failed-bg{
        min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;
        background:#e8eaf6;font-family:'Inter',system-ui,sans-serif;padding:24px;
      }
      .wt-failed-card{
        background:#fff;border-radius:32px;
        box-shadow:0 8px 60px rgba(0,0,0,.12);
        width:100%;max-width:480px;padding:52px 48px 44px;
        display:flex;flex-direction:column;align-items:center;text-align:center;
        animation:wt-fadein .6s cubic-bezier(.22,1,.36,1) both;
      }
      /* logo circle at top */
      .wt-brand-logo{
        display:flex;align-items:center;justify-content:center;
        margin-bottom:12px;
      }
      /* red/pink icon circle */
      .wt-err-ring{
        width:86px;height:86px;border-radius:50%;
        background:rgba(239,83,80,.08);
        display:flex;align-items:center;justify-content:center;
        margin-bottom:22px;position:relative;
        animation:wt-float 3s ease-in-out infinite;
      }
      .wt-err-ring::before{
        content:'';position:absolute;inset:-6px;border-radius:50%;
        border:2px dashed rgba(239,83,80,.25);
        animation:wt-pulse-ring 2.5s ease-in-out infinite;
      }
      .wt-err-inner{
        width:60px;height:60px;border-radius:50%;
        background:linear-gradient(135deg,#ef5350,#e53935);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 6px 20px rgba(229,57,53,.4);
      }
      /* next steps box */
      .wt-steps-box{
        background:#f8f9fb;border-radius:14px;padding:16px 18px;
        width:100%;margin-top:24px;display:flex;align-items:flex-start;gap:14px;
        border:1px solid #f0f1f5;
      }
      .wt-steps-icon{
        width:38px;height:38px;border-radius:10px;
        background:#fff;border:1px solid #e8eaf0;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;
        box-shadow:0 2px 8px rgba(0,0,0,.06);
      }
      /* contact rows */
      .wt-crow{display:flex;align-items:center;gap:10px;margin-top:12px;width:100%}
      .wt-cicon{
        width:34px;height:34px;border-radius:9px;
        background:linear-gradient(135deg,#eef0fd,#dde3ff);
        display:flex;align-items:center;justify-content:center;flex-shrink:0;
      }
      /* try again button */
      .wt-btn{
        width:100%;padding:14px;margin-top:28px;
        background:#1a237e;color:#fff;border:none;border-radius:14px;
        font-size:15px;font-weight:700;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:8px;
        box-shadow:0 4px 16px rgba(26,35,126,.35);transition:all .2s;
        font-family:'Inter',system-ui,sans-serif;letter-spacing:.2px;
      }
      .wt-btn:hover{background:#283593;box-shadow:0 8px 24px rgba(26,35,126,.45);transform:translateY(-1px)}
      .wt-btn:active{transform:translateY(0)}
      .wt-divider{width:100%;height:1px;background:#f0f1f5;margin:18px 0 0}
    </style>

    <div class="wt-failed-bg">
      <div class="wt-failed-card">

        <!-- Brand Logo -->
        <div class="wt-brand-logo">
          <img src="/WT-logo.ico" alt="WiseTech Logo" style="width:72px;height:72px;object-fit:contain" onerror="this.style.display='none'"/>
        </div>
        <p style="font-size:10px;font-weight:800;letter-spacing:2px;color:#37474f;text-transform:uppercase;margin-top:4px;margin-bottom:28px">
          WISETECH &nbsp;·&nbsp; MEP CONSULTANTS
        </p>

        <!-- Red error icon -->
        <div class="wt-err-ring">
          <div class="wt-err-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5M12 16.5h.01" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M3 12a9 9 0 1018 0A9 9 0 003 12z" stroke="white" stroke-width="2"/>
            </svg>
          </div>
        </div>

        <!-- Title & description -->
        <h1 style="font-size:24px;font-weight:800;color:#1a1a2e;letter-spacing:-.4px;margin-bottom:10px">
          Server Unreachable
        </h1>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;max-width:280px">
          We couldn't connect after <strong style="color:#374151">${BOOTSTRAP_RETRIES} attempts</strong>.
          Please contact your administrator or try again.
        </p>

        <!-- Next Steps box -->
        <div style="width:100%;margin-top:24px;background:#f8f9fb;border:1px solid #eef0f5;border-radius:14px;padding:18px 16px">
          <p style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;text-align:left">
            NEXT STEPS — CONTACT SUPPORT
          </p>

          <!-- Email -->
          <div class="wt-crow">
            <div class="wt-cicon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#4f63e8" stroke-width="2" stroke-linecap="round"/>
                <polyline points="22,6 12,13 2,6" stroke="#4f63e8" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div style="text-align:left">
              <p style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.8px">Email</p>
              <a href="mailto:support@wisetech.com" style="font-size:14px;font-weight:700;color:#1a237e;text-decoration:none">
                support@wisetech.com
              </a>
            </div>
          </div>

          <div class="wt-divider"></div>

          <!-- Phone -->
          <div class="wt-crow" style="margin-top:14px">
            <div class="wt-cicon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01 0 1.18 2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="#4f63e8" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div style="text-align:left">
              <p style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.8px">Phone</p>
              <a href="tel:+911234567890" style="font-size:14px;font-weight:700;color:#1a237e;text-decoration:none">
                +91 123 456 7890
              </a>
            </div>
          </div>

          <div class="wt-divider"></div>

          <!-- Hours -->
          <div class="wt-crow" style="margin-top:14px">
            <div class="wt-cicon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#4f63e8" stroke-width="2"/>
                <polyline points="12 6 12 12 16 14" stroke="#4f63e8" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div style="text-align:left">
              <p style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.8px">Working Hours</p>
              <p style="font-size:14px;font-weight:700;color:#374151">Mon–Fri &nbsp;9:00 AM – 6:00 PM IST</p>
            </div>
          </div>
        </div>

        <!-- Try Again button -->
        <button class="wt-btn" onclick="window.location.reload()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <polyline points="1 4 1 10 7 10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Try Again
        </button>

        <p style="margin-top:14px;font-size:11px;color:#d1d5db">
          Failed after ${BOOTSTRAP_RETRIES} connection attempts
        </p>

      </div>
    </div>
  `;
};

const bootstrapSession = (attempt = 1) => {
  store
    .dispatch(fetchRolesAndPermissions())
    .unwrap()
    .then(async () => {
      const { data: { user } } = await fetchCurrentUser(parsedLs.id)
      store.dispatch(saveCurrentUser({ ...user }))
      renderApp()
    })
    .catch((error) => {
      // Session already cleared → it was a real 401; the interceptor is
      // redirecting to /auth. Just render and let it happen.
      if (!localStorage.getItem("wise_tech_login")) {
        renderApp()
        return
      }
      if (attempt < BOOTSTRAP_RETRIES) {
        console.warn(`Bootstrap attempt ${attempt} failed — backend restarting? Retrying…`, error)
        showConnectingSplash(attempt)
        setTimeout(() => bootstrapSession(attempt + 1), 2000 * attempt)
        return
      }
      console.error("Failed to load roles and permissions:", error)
      // All retries exhausted — show the contact/failure page instead of a blank screen.
      showFailedSplash()
    })
}

// A session exists when we have a persisted user id. Cookie sessions carry no
// readable token — if the httpOnly cookie is missing/expired, the bootstrap
// request 401s, the interceptor clears the session, and the catch above routes
// to login. Legacy sessions are still short-circuited client-side when their
// persisted token has expired.
if (parsedLs?.id && (!hasLegacyToken || !isTokenExpired)) {
  bootstrapSession()
} else {
  localStorage.removeItem("wise_tech_login")
  renderApp()
}
