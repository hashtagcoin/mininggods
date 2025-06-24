// Global error handler to catch and diagnose undefined.length errors

export function setupGlobalErrorHandler() {
  // Store original console.error
  const originalConsoleError = console.error;

  // Override console.error to catch specific errors
  console.error = function(...args: any[]) {
    // Check if this is a length error
    const errorString = args.join(' ');
    if (errorString.includes("Cannot read properties of undefined (reading 'length')") ||
        errorString.includes("Cannot read property 'length' of undefined")) {
      
      console.warn('🚨 LENGTH ERROR DETECTED - Attempting to diagnose...');
      
      // Try to extract stack trace
      const error = args.find(arg => arg instanceof Error);
      if (error && error.stack) {
        console.warn('Stack trace:', error.stack);
        
        // Try to identify the source
        const stackLines = error.stack.split('\n');
        const relevantLine = stackLines.find(line => 
          line.includes('.tsx') || line.includes('.ts') && 
          !line.includes('node_modules')
        );
        
        if (relevantLine) {
          console.warn('🎯 Error likely originated from:', relevantLine.trim());
        }
      }
    }
    
    // Call original console.error
    originalConsoleError.apply(console, args);
  };

  // Global unhandled rejection handler
  window.addEventListener('unhandledrejection', event => {
    if (event.reason && event.reason.message) {
      const message = event.reason.message;
      if (message.includes("Cannot read properties of undefined (reading 'length')") ||
          message.includes("Cannot read property 'length' of undefined")) {
        console.warn('🚨 UNHANDLED LENGTH ERROR:', event.reason);
        console.warn('Promise rejection stack:', event.reason.stack);
      }
    }
  });

  // Global error handler
  window.addEventListener('error', event => {
    if (event.error && event.error.message) {
      const message = event.error.message;
      if (message.includes("Cannot read properties of undefined (reading 'length')") ||
          message.includes("Cannot read property 'length' of undefined")) {
        console.warn('🚨 GLOBAL LENGTH ERROR CAUGHT:');
        console.warn('Message:', message);
        console.warn('Filename:', event.filename);
        console.warn('Line:', event.lineno);
        console.warn('Column:', event.colno);
        console.warn('Stack:', event.error.stack);
        
        // Try to provide more context
        if (event.filename && event.lineno) {
          console.warn(`🎯 Error at: ${event.filename}:${event.lineno}:${event.colno}`);
        }
      }
    }
  });
}

// Install handler when module is imported
if (typeof window !== 'undefined') {
  setupGlobalErrorHandler();
}