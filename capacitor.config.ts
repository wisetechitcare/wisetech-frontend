import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.wisetech.hrms',
    appName: 'WiseTech HRMS',
    webDir: 'dist',
    // For live-reload during development, uncomment and point at your dev server
    // (LAN IP or tunnel), then run `npx cap run android`:
    // server: { url: 'http://192.168.0.102:5173', cleartext: true },
};

export default config;
