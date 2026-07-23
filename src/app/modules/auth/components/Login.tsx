import { useEffect, useMemo, useState } from "react";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import { login } from "@services/auth";
import { fetchCurrentUser } from "@services/users";
import { fetchCurrentEmployeeByUserId } from "@services/employee";
import { fetchCompanyLogo } from "@services/company";
import { saveCurrentEmployee } from "@redux/slices/employee";
import { redirect, saveCurrentUser, saveToken } from "@redux/slices/auth";
import { RootState } from "@redux/store";
import { getAvatar } from "@utils/avatar";
import { setAuth } from "../core/AuthHelpers";
import { toAbsoluteUrl, KTIcon } from "@metronic/helpers";
import { makeTokens } from "@app/theme/tokens";
import { useColorMode, ColorModeToggle } from "@app/theme/ColorMode";
import TextType from "@components/reactbits/TextType";
import CursorField from "@components/reactbits/CursorField";

// Locked navy brand (see DESIGN_SYSTEM.md). Deep navy is used for the primary CTA
// in BOTH modes so white label text always has contrast.
const BRAND_NAVY = "#1E3A8A";
const BRAND_NAVY_HOVER = "#172554";

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Wrong email format")
    .min(3, "Minimum 3 symbols")
    .max(50, "Maximum 50 symbols")
    .required("Email is required"),
  password: Yup.string()
    .min(3, "Minimum 3 symbols")
    .max(50, "Maximum 50 symbols")
    .required("Password is required"),
});

const initialValues = {
  email: "",
  password: "",
};

/**
 * Premium sign-in form. Presentation is MUI + design tokens; the auth flow
 * (Formik + Yup → login() → save token/user/employee → redirect) is preserved
 * exactly as the previous Metronic implementation.
 */
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currEmployee = useSelector(
    (state: RootState) => state.employee.currentEmployee
  );

  // Show exit-date message if available from prior session termination
  useEffect(() => {
    const exitMessage = sessionStorage.getItem('session_exit_date_message');
    if (exitMessage) {
      toast.error(exitMessage, { autoClose: 5000 });
      sessionStorage.removeItem('session_exit_date_message');
    }
  }, []);

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setLoading(true);
      try {
        const { data: loginRes } = await login(values.email, values.password);
        dispatch(saveToken(loginRes.token));
        setAuth(loginRes);
        const { data: currUserRes } = await fetchCurrentUser(loginRes.id);
        dispatch(saveCurrentUser(currUserRes.user));
        if (!currEmployee.id) {
          const { data: currEmpRes } = await fetchCurrentEmployeeByUserId(
            currUserRes.user.id
          );
          const { employee } = currEmpRes;
          const avatar = getAvatar(employee.avatar, employee.gender);
          dispatch(saveCurrentEmployee({ ...employee, avatar }));
        }
        dispatch(redirect(true));
        localStorage.setItem("redirectToDashboard", "true");
        setLoading(false);
      } catch (error: any) {
        const data = error?.response?.data;
        setSubmitting(false);
        setLoading(false);
        // Inactive / exited employee — the backend flags this so we can send them
        // to the dedicated "connect with HR" page instead of an inline error.
        if (data?.meta?.code === "ACCOUNT_INACTIVE") {
          navigate("/auth/inactive", { state: { message: data?.detail } });
          return;
        }
        setStatus(data?.detail);
      }
    },
  });

  const emailError = formik.touched.email && Boolean(formik.errors.email);
  const passwordError =
    formik.touched.password && Boolean(formik.errors.password);

  return (
    <Box
      component="form"
      onSubmit={formik.handleSubmit}
      noValidate
      id="kt_login_signin_form"
      sx={{ width: "100%" }}
    >
      {formik.status ? (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}
        >
          {formik.status}
        </Alert>
      ) : null}

      <Stack spacing={2.5}>
        <TextField
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="off"
          fullWidth
          {...formik.getFieldProps("email")}
          error={emailError}
          helperText={emailError ? String(formik.errors.email) : " "}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <KTIcon iconName="sms" className="fs-4 text-muted" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          autoComplete="off"
          fullWidth
          {...formik.getFieldProps("password")}
          error={passwordError}
          helperText={passwordError ? String(formik.errors.password) : " "}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <KTIcon iconName="lock" className="fs-4 text-muted" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  aria-label="toggle password visibility"
                  size="small"
                >
                  <KTIcon
                    iconName={showPassword ? "eye-slash" : "eye"}
                    className="fs-3"
                  />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5, mb: 3 }}>
        <MuiLink
          component={Link}
          to="/auth/forgot-password"
          underline="hover"
          sx={{ fontSize: 14, fontWeight: 600, color: "primary.main" }}
        >
          Forgot Password?
        </MuiLink>
      </Box>

      <Button
        type="submit"
        id="kt_sign_in_submit"
        variant="contained"
        fullWidth
        disabled={formik.isSubmitting || !formik.isValid}
        sx={{
          py: 1.5,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          borderRadius: 2.5,
          textTransform: "none",
          // Glossy navy CTA (UI-kit `ctaSx` recipe): 180° gradient + triple shadow
          // (crisp 1px · long soft glow · inset white top-highlight for the glass
          // edge) + hover lift / active press. !important beats the app's clashing
          // global color systems (#AA393D reds, MaterialTable's local theme).
          background: `linear-gradient(180deg, ${BRAND_NAVY} 0%, ${BRAND_NAVY_HOVER} 100%) !important`,
          color: "#fff !important",
          boxShadow:
            "0 1px 2px rgba(30,58,138,0.35), 0 12px 26px -10px rgba(30,58,138,0.70), inset 0 1px 0 rgba(255,255,255,0.18)",
          transition:
            "transform .16s cubic-bezier(.22,.61,.36,1), box-shadow .2s ease",
          "&:hover": {
            background: "linear-gradient(180deg, #24449E 0%, #1B2C63 100%) !important",
            transform: "translateY(-1px)",
            boxShadow:
              "0 2px 4px rgba(30,58,138,0.40), 0 16px 32px -10px rgba(30,58,138,0.82), inset 0 1px 0 rgba(255,255,255,0.20)",
          },
          "&:active": { transform: "translateY(0) scale(0.985)" },
          "&.Mui-disabled": {
            background: "rgba(30,58,138,0.40) !important",
            color: "rgba(255,255,255,0.85) !important",
            boxShadow: "none",
          },
        }}
      >
        {loading ? (
          <>
            <CircularProgress size={18} thickness={5} sx={{ color: "#fff", mr: 1.5 }} />
            Please wait…
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </Box>
  );
}

export default function Login() {
  const defaultLogo =
    "https://wise-tech-asset-store.s3.ap-south-1.amazonaws.com/4100960a0f2c5e89381847e6637d3e67aa43d39330";

  const [logoSrc, setLogoSrc] = useState(defaultLogo);
  const { mode } = useColorMode();
  const t = makeTokens(mode);
  const baseTheme = useTheme();
  const isDesktop = useMediaQuery(baseTheme.breakpoints.up("lg"));
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Antigravity-style cursor-field dash colors — brand navy + toned accents that
  // read on white (light) and glow on graphite (dark).
  const fieldColors =
    mode === "dark"
      ? ["#6E9BFF", "#8AB0FF", "#40C8E0", "#BF5AF2", "#FF9F0A", "#FF6961"]
      : ["#1E3A8A", "#5856D6", "#30B0C7", "#AF52DE", "#FF9500", "#FF3B30"];

  // Scoped navy-primary theme — isolates the auth screen from the app's clashing
  // red/theme systems so focus rings, links and accents are consistently navy.
  // Mode-aware so navy stays legible on the dark form surface.
  const linkNavy = mode === "dark" ? "#6E9BFF" : BRAND_NAVY;
  const authTheme = useMemo(
    () =>
      createTheme(baseTheme, {
        palette: {
          primary: {
            main: linkNavy,
            dark: BRAND_NAVY_HOVER,
            contrastText: "#ffffff",
          },
        },
      }),
    [baseTheme, linkNavy]
  );

  useEffect(() => {
    async function getCompanyLogo() {
      try {
        const {
          data: { logo },
        } = await fetchCompanyLogo();
        if (logo) setLogoSrc(logo); // keep default if no logo is set
      } catch {
        /* keep default logo */
      }
    }
    getCompanyLogo();
  }, []);

  // Adaptive logo lockup — subtle plate keeps any logo legible on light or dark.
  const LogoPlate = ({ size }: { size: string }) => (
    <Box
      sx={{
        display: "inline-flex",
        p: 1.5,
        borderRadius: 3,
        bgcolor: t.bg.elevated,
        border: `1px solid ${t.label.quaternary}`,
        boxShadow: t.shadow.card,
      }}
    >
      <Box
        component="img"
        src={logoSrc}
        alt="Company logo"
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (img.src !== defaultLogo) img.src = defaultLogo;
        }}
        sx={{ height: size, objectFit: "contain", display: "block" }}
      />
    </Box>
  );

  // Typewriter "autocomplete" headline (React Bits TextType), with a static
  // fallback for reduced motion. Navy caret; ink text.
  const AnimatedHeadline = ({
    sizeClamp,
    center,
    initialDelay = 300,
  }: {
    sizeClamp: string;
    center?: boolean;
    initialDelay?: number;
  }) => {
    const headSx = {
      "& .rb-headline": {
        fontFamily: t.font.display,
        fontSize: sizeClamp,
        fontWeight: 700,
        letterSpacing: "-0.025em",
        lineHeight: 1.12,
        color: t.label.primary,
        display: "inline-block",
        textAlign: center ? "center" : "left",
      },
      "& .text-type__cursor": { color: BRAND_NAVY, fontWeight: 400 },
    } as const;

    if (prefersReducedMotion) {
      return (
        <Box sx={headSx}>
          <span className="rb-headline">Fast, Efficient &amp; Productive</span>
        </Box>
      );
    }
    return (
      <Box sx={headSx}>
        <TextType
          as="span"
          className="rb-headline"
          text="Fast, Efficient & Productive"
          typingSpeed={55}
          initialDelay={initialDelay}
          loop={false}
          showCursor
          cursorCharacter={
            // Antigravity-style gradient caret (blue → purple → pink → amber)
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: "0.09em",
                height: "0.92em",
                ml: 0,
                verticalAlign: "-0.1em",
                borderRadius: "0.06em",
                background:
                  "linear-gradient(180deg, #4285F4 0%, #9B72CB 42%, #D96570 72%, #F9AB55 100%)",
                boxShadow: "0 0 8px rgba(155,114,203,0.55)",
              }}
            />
          }
        />
      </Box>
    );
  };

  const cardSx = {
    width: "100%",
    maxWidth: 440,
    p: { xs: 3, sm: 4.5 },
    borderRadius: `${t.radius.card}px`,
    bgcolor: mode === "dark" ? "rgba(22,26,36,0.94)" : "rgba(255,255,255,0.97)",
    border: `1px solid ${t.label.quaternary}`,
    boxShadow: t.shadow.modal,
    animation: "wtCardIn 0.5s cubic-bezier(0.16,1,0.3,1) both",
    "@keyframes wtCardIn": {
      from: { opacity: 0, transform: "translateY(12px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
  } as const;

  return (
    <ThemeProvider theme={authTheme}>
      <Box
        sx={{
          position: "relative",
          minHeight: "100vh",
          width: "100%",
          overflow: "hidden",
          bgcolor: t.bg.base,
          fontFamily: t.font.body,
        }}
      >
        {/* ── Antigravity-style cursor-gravity dash field (full-bleed) ── */}
        <Box aria-hidden sx={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <CursorField colors={fieldColors} />
        </Box>

        <ColorModeToggle
          sx={{ position: "absolute", top: 16, right: 16, zIndex: 3, color: t.label.secondary }}
        />

        {/* ── Content ── */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.05fr 1fr" },
          }}
        >
          {/* Brand showcase (desktop) — content floats over the field */}
          {isDesktop && (
            <Box
              sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                px: 9,
                py: 8,
              }}
            >
              <Box sx={{ position: "absolute", top: 44, left: 56 }}>
                <LogoPlate size="clamp(64px, 6.5vw, 96px)" />
              </Box>
              <Box
                sx={{
                  animation: "wtFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
                  "@keyframes wtFadeUp": {
                    from: { opacity: 0, transform: "translateY(16px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                <Box
                  component="img"
                  src={toAbsoluteUrl("media/login/WTgif.gif")}
                  alt=""
                  sx={{ width: "min(380px, 70%)", mb: 5, display: "block", pointerEvents: "none" }}
                />
                <AnimatedHeadline sizeClamp="clamp(30px, 3.2vw, 44px)" />
                <Typography
                  sx={{ mt: 2, fontSize: 17, color: t.label.secondary, maxWidth: 440 }}
                >
                  The all-in-one employee management platform — attendance, leave,
                  payroll and more, in one place.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Form column */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              px: { xs: 2.5, sm: 5 },
              py: { xs: 5, sm: 6 },
            }}
          >
            {/* Mobile brand block (brand panel hidden) */}
            {!isDesktop && (
              <Box sx={{ mb: 3.5, textAlign: "center" }}>
                <LogoPlate size="clamp(52px, 13vw, 68px)" />
                <Box sx={{ mt: 2.5 }}>
                  <AnimatedHeadline sizeClamp="clamp(22px, 7vw, 30px)" center initialDelay={250} />
                </Box>
              </Box>
            )}

            <Box sx={cardSx}>
              <Box sx={{ mb: 3.5, textAlign: { xs: "center", lg: "left" } }}>
                <Typography
                  sx={{
                    fontFamily: t.font.display,
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: t.label.primary,
                  }}
                >
                  Welcome back
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 15, color: t.label.secondary }}>
                  Managing your organization made easy.
                </Typography>
              </Box>

              <LoginForm />

              <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 4 }}>
                {["FAQs", "Plans", "Contact Us"].map((label) => (
                  <MuiLink
                    key={label}
                    href="/"
                    target="_blank"
                    underline="hover"
                    sx={{ fontSize: 13.5, fontWeight: 500, color: t.label.secondary }}
                  >
                    {label}
                  </MuiLink>
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
