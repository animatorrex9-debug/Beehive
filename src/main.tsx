import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle Google OAuth callback inside the popup window
if (
  typeof window !== 'undefined' &&
  window.opener &&
  (window.location.hash.includes('access_token=') || 
   window.location.search.includes('code=') ||
   window.location.hash.includes('type=signup') ||
   window.location.hash.includes('type=recovery'))
) {
  console.log('[OAuth Popup] Google OAuth callback detected. Sending message to parent iframe and closing...');
  
  // Wait a short duration for Supabase JS client inside the popup to process and store the tokens
  setTimeout(() => {
    try {
      window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
      window.close();
    } catch (e) {
      console.error('[OAuth Popup] Error sending message to opener:', e);
    }
  }, 1000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
