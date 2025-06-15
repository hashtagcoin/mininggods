import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import MainGame from './components/MainGame';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainGame />
    </ThemeProvider>
  );
}

export default App;
