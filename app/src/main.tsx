import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Fonts are bundled, not fetched. The prototype pulled Source Serif 4 and
   Caveat from Google Fonts, which is fine in a browser and useless in an app
   that has to work on a train. */
import '@fontsource-variable/source-serif-4';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/600.css';

import './styles/tokens.css';
import './styles/app.css';

import App from './App';
import { StoreProvider } from './state/store';
import { initNative } from './lib/native';

initNative();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
