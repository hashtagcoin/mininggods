import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './theme';
import MainGame from './components/MainGame';

let appRenderCount = 0;

function App() {
  console.log(`[APP-${++appRenderCount}] ========== App render ==========`);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainGame />
    </ThemeProvider>
  );
}

export default App;
