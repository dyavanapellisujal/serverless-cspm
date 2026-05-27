import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Box,
  Menu,
  MenuItem,
  ListItemText,
  Divider,
  Chip,
  Snackbar,
  Alert,
  Button
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const Navbar = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Deleted Bucket Notification State
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [currentDeletedLog, setCurrentDeletedLog] = useState(null);
  const [deletedNotifications, setDeletedNotifications] = useState([]);
  const [processedLogIds, setProcessedLogIds] = useState(new Set());

  useEffect(() => {
    fetchNotifications();
    fetchDeletedLogs();

    // Refresh notifications and check for deleted logs
    const interval = setInterval(() => {
      fetchNotifications();
      fetchDeletedLogs();
    }, 10000); // Check every 10 seconds as requested

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/findings?severity=Critical&limit=5`);
      const criticalFindings = response.data.findings || [];
      setNotifications(criticalFindings);
      // Update count to include both critical findings and deleted logs
      setNotificationCount(criticalFindings.length + deletedNotifications.length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchDeletedLogs = async () => {
    try {
      // Check for logs in the last 15 seconds to ensure we catch everything between intervals
      const response = await axios.get(`${API_BASE_URL}/logs/latest?seconds=15`);
      const logs = response.data.logs || [];

      if (logs.length > 0) {
        // Find logs we haven't processed yet
        const newLogs = logs.filter(log => !processedLogIds.has(log.bucket_name + log.deleted_at));

        if (newLogs.length > 0) {
          const newestLog = newLogs[0];
          setCurrentDeletedLog(newestLog);
          setSnackbarOpen(true);

          // Add to notifications list
          setDeletedNotifications(prev => [...newLogs, ...prev]);

          // Mark as processed
          const newIds = new Set(processedLogIds);
          newLogs.forEach(log => newIds.add(log.bucket_name + log.deleted_at));
          setProcessedLogIds(newIds);

          // Update total count
          setNotificationCount(prev => prev + newLogs.length);
        }
      }
    } catch (err) {
      console.error('Error fetching deleted logs:', err);
    }
  };

  const handleSaveReport = () => {
    setSnackbarOpen(false);
    if (currentDeletedLog) {
      // Navigate to reports page with params
      navigate(`/reports?bucket=${currentDeletedLog.bucket_name}&deleted=true`);
    }
  };

  const handleSaveLog = () => {
    // "Saved as Log" is the default behavior (it's already in Mongo), so just close.
    setSnackbarOpen(false);
  };

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationItemClick = (findingId) => {
    handleClose();
    navigate(`/finding/${findingId}`);
  };

  const handleRefresh = () => {
    fetchNotifications();
    fetchDeletedLogs();
    window.location.reload();
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      default: return 'default';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#262626',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      <Toolbar>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { opacity: 0.8 }
          }}
          onClick={() => navigate('/')}
        >
          <SecurityIcon
            sx={{
              mr: 2,
              color: '#FF7F11',
              filter: 'drop-shadow(0 0 2px #FF7F11)'
            }}
            className="animate-glow"
          />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              letterSpacing: 0.5,
              color: '#E2E8CE'
            }}
          >
            Serverless CSPM
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="inherit"
            title="Refresh Data"
            sx={{ color: '#ACBFA4' }}
            onClick={handleRefresh}
          >
            <RefreshIcon />
          </IconButton>

          <IconButton
            color="inherit"
            title="Notifications"
            sx={{ color: '#ACBFA4' }}
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                mt: 1,
                width: 360,
                maxHeight: 400,
                bgcolor: '#262626',
                color: '#E2E8CE',
                border: '1px solid rgba(255, 127, 17, 0.2)',
              }
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="h6" sx={{ color: '#FF7F11' }}>
                Notifications
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {notificationCount} new {notificationCount === 1 ? 'alert' : 'alerts'}
              </Typography>
            </Box>

            {/* Deleted Buckets Section */}
            {deletedNotifications.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: '#FF7F11', bgcolor: 'rgba(255, 127, 17, 0.05)' }}>
                  Recent Deletions
                </Typography>
                {deletedNotifications.map((log, index) => (
                  <MenuItem
                    key={`del-${index}`}
                    onClick={() => { handleClose(); navigate(`/reports?bucket=${log.bucket_name}&deleted=true`); }}
                    sx={{
                      py: 1.5,
                      '&:hover': { bgcolor: 'rgba(255, 127, 17, 0.1)' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Bucket Deleted: {log.bucket_name}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#ACBFA4' }}>
                          {log.finding_count} vulnerabilities archived • {new Date(log.deleted_at).toLocaleTimeString()}
                        </Typography>
                      }
                    />
                  </MenuItem>
                ))}
                <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              </>
            )}

            {/* Critical Issues Section */}
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: '#d32f2f', bgcolor: 'rgba(211, 47, 47, 0.05)' }}>
              Critical Security ALerts
            </Typography>

            {notifications.length === 0 ? (
              <MenuItem disabled>
                <ListItemText primary="No critical findings" />
              </MenuItem>
            ) : (
              notifications.map((finding, index) => (
                <React.Fragment key={finding._id}>
                  <MenuItem
                    onClick={() => handleNotificationItemClick(finding._id)}
                    sx={{
                      py: 1.5,
                      '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.1)' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={finding.severity}
                            color={getSeverityColor(finding.severity)}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {finding.service}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#ACBFA4' }}>
                          {finding.title}
                        </Typography>
                      }
                    />
                  </MenuItem>
                  {index < notifications.length - 1 && <Divider sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />}
                </React.Fragment>
              ))
            )}


            <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
            <MenuItem
              onClick={() => { handleClose(); navigate('/critical'); }}
              sx={{
                justifyContent: 'center',
                color: '#FF7F11',
                fontWeight: 600,
                '&:hover': { bgcolor: 'rgba(255, 127, 17, 0.1)' }
              }}
            >
              View All Critical Issues
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Deleted Bucket Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={10000}
        onClose={handleSaveLog}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSaveLog}
          severity="warning"
          variant="filled"
          sx={{ width: '100%', bgcolor: '#262626', color: '#E2E8CE', border: '1px solid #FF7F11' }}
          action={
            <Box>
              <Button color="inherit" size="small" onClick={handleSaveReport}>
                Save Report
              </Button>
              <Button color="inherit" size="small" onClick={handleSaveLog}>
                Save as Log
              </Button>
            </Box>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Bucket Deleted: {currentDeletedLog?.bucket_name}
          </Typography>
          <Typography variant="caption">
            {currentDeletedLog?.finding_count} vulnerabilities were detected.
          </Typography>
        </Alert>
      </Snackbar>
    </AppBar>
  );
};

export default Navbar;