import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';

import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'All Findings', icon: <SecurityIcon />, path: '/findings' },
  { text: 'Critical Issues', icon: <WarningIcon />, path: '/critical' },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },

];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          mt: 8,
          backgroundColor: '#262626',
          color: '#E2E8CE',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', py: 2 }}>
        <Box sx={{ px: 3, mb: 2 }}>
          <Typography variant="overline" sx={{ color: '#ACBFA4', fontWeight: 700, opacity: 0.7 }}>
            Main Menu
          </Typography>
        </Box>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 127, 17, 0.2)',
                    color: '#FF7F11',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 127, 17, 0.3)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname === item.path ? '#FF7F11' : '#ACBFA4',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '0.9rem',
                      fontWeight: location.pathname === item.path ? 600 : 400,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', mx: 2 }} />

        <Box sx={{ px: 3, mb: 1 }}>
          <Typography variant="overline" sx={{ color: '#ACBFA4', fontWeight: 700, opacity: 0.7 }}>
            System
          </Typography>
        </Box>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              sx={{
                mx: 1,
                borderRadius: 2,
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              <ListItemIcon sx={{ color: '#ACBFA4', minWidth: 40 }}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
