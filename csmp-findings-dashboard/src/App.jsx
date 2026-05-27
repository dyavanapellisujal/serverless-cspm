import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import Dashboard from './components/Dashboard';
import Findings from './components/Findings';
import Reports from './components/Reports';
import FindingDetail from './components/FindingDetail';
import CriticalIssues from './components/CriticalIssues';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF7F11', // Orange
      contrastText: '#fff',
    },
    secondary: {
      main: '#ACBFA4', // Sage Green
    },
    background: {
      default: '#E2E8CE', // Cream
      paper: '#ffffff',
    },
    text: {
      primary: '#262626',
      secondary: '#555555',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
          <Navbar />
          <Sidebar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 4,
              mt: 8, // Account for navbar height
              ml: '240px', // Account for sidebar width
              width: { sm: `calc(100% - 240px)` },
              transition: 'all 0.3s ease',
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/findings" element={<Findings />} />
              <Route path="/critical" element={<CriticalIssues />} />
              <Route path="/reports" element={<Reports />} />

              <Route path="/finding/:id" element={<FindingDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
