import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { theme } from './theme.ts'
import App from './App.tsx'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

console.log('[MAIN] Starting application at', new Date().toISOString());
console.log('[MAIN] Creating root and rendering App');

// Add a periodic summary logger
let summaryCount = 0;
setInterval(() => {
  console.log(`\n[SUMMARY-${++summaryCount}] ===== Component State Summary =====`);
  console.log(`[SUMMARY-${summaryCount}] Time: ${new Date().toISOString()}`);
  console.log(`[SUMMARY-${summaryCount}] This summary appears every 5 seconds`);
  console.log(`[SUMMARY-${summaryCount}] If you see rapid updates between summaries, that indicates the infinite loop`);
  console.log(`[SUMMARY-${summaryCount}] =================================\n`);
}, 5000);

// Add error boundary at the highest level
try {
  createRoot(document.getElementById('root')!).render(
    // Temporarily disabled StrictMode to avoid double renders causing infinite loops
    // <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    // </StrictMode>,
  )
} catch (error) {
  console.error('[MAIN] Fatal error during initial render:', error);
}

console.log('[MAIN] Initial render complete');
