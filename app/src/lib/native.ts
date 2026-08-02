import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

/** Native chrome setup, run once at boot.
 *
 *  The app is a light paper ground throughout, so the status bar takes dark
 *  content and the WebView is told not to resize when the keyboard appears —
 *  the ledger's absolutely-positioned scroll regions handle their own insets,
 *  and letting iOS resize the viewport underneath them makes the tab bar jump. */
export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return;

  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  Keyboard.setResizeMode({ mode: KeyboardResize.None }).catch(() => {});
  Keyboard.setScroll({ isDisabled: true }).catch(() => {});
}
