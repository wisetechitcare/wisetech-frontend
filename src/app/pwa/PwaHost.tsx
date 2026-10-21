import { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Download, RefreshCw, Share } from 'lucide-react';
import { WtButton } from '@app/modules/common/components/ui';
import {
  clearInstallPrompt,
  getInstallPrompt,
  InstallPromptEvent,
  isIos,
  isStandalone,
  subscribeToInstallPrompt,
} from './install';
import { PWA_UPDATE_EVENT } from './serviceWorker';

const DISMISSED_KEY = 'wt-pwa-install-dismissed';

export function PwaHost() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;
    setShowIosHelp(isIos());
    setPrompt(getInstallPrompt());
    return subscribeToInstallPrompt((next) => {
      setPrompt(next);
      if (!next && isStandalone()) {
        setShowIosHelp(false);
        localStorage.removeItem(DISMISSED_KEY);
      }
    });
  }, []);

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener(PWA_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, onUpdate);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    clearInstallPrompt();
    setShowIosHelp(false);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    clearInstallPrompt();
  };

  if (!prompt && !showIosHelp && !updateReady) return null;

  return (
    <Paper
      role='status'
      aria-live='polite'
      elevation={8}
      sx={{
        position: 'fixed', right: { xs: 12, sm: 24 }, bottom: { xs: 12, sm: 24 }, zIndex: 1600,
        width: { xs: 'calc(100% - 24px)', sm: 390 }, p: 2.25, borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
      }}
    >
      {updateReady ? (
        <>
          <Typography variant='subtitle1' fontWeight={800}>WiseTech HR has been updated</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Reload to use the latest version.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <WtButton size='small' startIcon={<RefreshCw size={17} />} onClick={() => location.reload()}>
              Reload
            </WtButton>
          </Box>
        </>
      ) : (
        <>
          <Typography variant='subtitle1' fontWeight={800}>Install WiseTech HR</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {showIosHelp
              ? <>Tap <Share size={15} style={{ verticalAlign: 'text-bottom' }} /> Share, then choose “Add to Home Screen”.</>
              : 'Add WiseTech HR to this device for faster, app-like access.'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <WtButton ghost size='small' onClick={dismiss}>Not now</WtButton>
            {prompt && (
              <WtButton size='small' startIcon={<Download size={17} />} onClick={install}>Install</WtButton>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
