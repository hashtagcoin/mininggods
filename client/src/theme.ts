import { createTheme } from '@mui/material/styles';

// Industrial Sci-Fi Theme for Mining Gods
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#F6AD55', // accent.400 (Amber)
      dark: '#DD8418',
      light: '#F9C686',
      contrastText: '#1A202C', // brand.900 (Charcoal)
    },
    secondary: {
      main: '#4FD1C5', // info.400 (Cyan)
      dark: '#2C7A7B',
      light: '#7FDBDA',
      contrastText: '#1A202C',
    },
    error: {
      main: '#F56565', // danger.400 (Red)
      dark: '#C53030',
      light: '#F7B4B4',
    },
    success: {
      main: '#48BB78', // success.400 (Green)
      dark: '#2F855A',
      light: '#7FD19F',
    },
    background: {
      default: '#1A202C', // brand.900 (Charcoal)
      paper: '#2D3748', // brand.800 (Slate)
    },
    text: {
      primary: '#F7FAFC', // brand.50 (Off-White)
      secondary: '#A0AEC0', // brand.300 (Grey)
      disabled: '#4A5568', // brand.700 (Steel)
    },
    divider: '#4A5568', // brand.700 (Steel)
    action: {
      hover: 'rgba(246, 173, 85, 0.08)', // Primary with low opacity
      selected: 'rgba(246, 173, 85, 0.16)',
      disabled: '#4A5568',
      disabledBackground: '#2D3748',
    },
  },
  typography: {
    fontFamily: `'Roboto', sans-serif`,
    h1: {
      fontSize: '30px',
      fontWeight: 700,
      color: '#F7FAFC',
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
    },
    h2: {
      fontSize: '24px',
      fontWeight: 500,
      color: '#F7FAFC',
      textTransform: 'uppercase',
      letterSpacing: '0.01em',
    },
    h3: {
      fontSize: '18px',
      fontWeight: 700,
      color: '#F7FAFC',
    },
    body1: {
      fontSize: '16px',
      fontWeight: 400,
      color: '#F7FAFC',
    },
    caption: {
      fontSize: '14px',
      fontWeight: 400,
      color: '#A0AEC0',
    },
    button: {
      fontSize: '16px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          textTransform: 'uppercase',
          fontWeight: 700,
          minHeight: '40px',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
          },
        },
        contained: {
          backgroundColor: '#F6AD55',
          color: '#1A202C',
          '&:hover': {
            backgroundColor: '#DD8418',
          },
        },
        outlined: {
          border: '1px solid #4A5568',
          backgroundColor: '#2D3748',
          color: '#F7FAFC',
          '&:hover': {
            backgroundColor: '#4A5568',
            border: '1px solid #F6AD55',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#2D3748',
          border: '1px solid #4A5568',
          borderRadius: '8px',
          backdropFilter: 'blur(4px)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1A202C',
            '& fieldset': {
              borderColor: '#4A5568',
            },
            '&:hover fieldset': {
              borderColor: '#A0AEC0',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#F6AD55',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#A0AEC0',
          },
          '& .MuiOutlinedInput-input': {
            color: '#F7FAFC',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A202C',
          border: '1px solid #4A5568',
          borderRadius: '2px',
          height: '8px',
        },
        colorPrimary: {
          backgroundColor: '#1A202C',
        },
        barColorPrimary: {
          backgroundColor: '#F6AD55',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2D3748',
          border: '1px solid #4A5568',
          borderRadius: '8px',
          '&:hover': {
            borderColor: '#F6AD55',
            boxShadow: '0 0 8px rgba(246, 173, 85, 0.3)',
          },
        },
      },
    },
  },
});
