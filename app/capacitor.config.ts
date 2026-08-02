import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.intaking.ledger',
  appName: 'Intaking',
  webDir: 'dist',
  ios: {
    // The paper ground, so there is no white flash between the splash screen
    // and the first paint of the ledger.
    backgroundColor: '#f3f2f2',
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    Keyboard: {
      resize: 'none' as never,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#0088b0',
    },
  },
};

export default config;
