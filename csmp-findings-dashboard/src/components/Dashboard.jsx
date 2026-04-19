import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GppGoodIcon from '@mui/icons-material/GppGood';

const API_BASE_URL = 'http://localhost:5000/api';

const mockTrendData = [
  { name: 'Day 1', findings: 4 },
  { name: 'Day 5', findings: 7 },
  { name: 'Day 10', findings: 12 },
  { name: 'Day 15', findings: 8 },
  { name: 'Day 20', findings: 15 },
  { name: 'Day 25', findings: 10 },
  { name: 'Present', findings: 18 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentFindings, setRecentFindings] = useState([]);
  
  // Dynamic data based on stats
  const trendData = stats?.total_findings > 0 ? [
    ...mockTrendData.slice(0, -1),
    { name: 'Present', findings: stats.total_findings }
  ] : mockTrendData;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, findingsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/stats`),
          axios.get(`${API_BASE_URL}/findings?limit=5`)
        ]);
        setStats(statsRes.data);
        setRecentFindings(findingsRes.data.findings || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);
  
  const complianceScore = stats?.total_findings > 0 
    ? Math.round(((stats.status_distribution?.find(s => s._id === 'resolved')?.count || 0) / stats.total_findings) * 100)
    : 100;

  const formatTime = (time) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card className="glass-card" sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            p: 1.5,
            borderRadius: '12px',
            bgcolor: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
          </Box>
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
          {value || 0}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress thickness={5} size={60} />
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', mb: 1 }}>
          Security Posture Overview
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Real-time security monitoring for your cloud infrastructure.
        </Typography>
      </Box>

      {/* Hero Stats (Row 1) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Findings"
            value={stats?.total_findings}
            icon={<SecurityIcon />}
            color="#262626"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Critical Issues"
            value={stats?.severity_distribution?.find(s => s._id === 'CRITICAL')?.count}
            icon={<ErrorOutlineIcon />}
            color="#FF7F11"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Warnings"
            value={stats?.severity_distribution?.find(s => s._id === 'HIGH')?.count}
            icon={<WarningIcon />}
            color="#E4A11B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Resolved Findings"
            value={stats?.status_distribution?.find(s => s._id === 'resolved')?.count}
            icon={<CheckCircleOutlineIcon />}
            color="#ACBFA4"
          />
        </Grid>
      </Grid>

      {/* Main Content (Row 2) */}
      <Grid container spacing={3}>
        {/* Left: Affected Services */}
        <Grid item xs={12} md={7}>
          <Card className="glass-card" sx={{ height: '360px' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                Top Affected Services
              </Typography>
              <Box sx={{ mt: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {stats?.service_distribution?.length > 0 ? stats.service_distribution.map((service, index) => (
                  <Box key={index} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{service._id}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{service.count}</Typography>
                    </Box>
                    <Box sx={{
                      width: '100%',
                      height: 10,
                      bgcolor: 'rgba(0,0,0,0.05)',
                      borderRadius: 5,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{
                        width: `${(service.count / stats.total_findings) * 100}%`,
                        height: '100%',
                        bgcolor: index === 0 ? '#FF7F11' : '#ACBFA4',
                        transition: 'width 1s ease-in-out'
                      }} />
                    </Box>
                  </Box>
                )) : (
                  <Typography variant="body2" color="textSecondary" align="center">
                    No service data available.
                  </Typography>
                )}
              </Box>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/findings')}
                sx={{ mt: 'auto', alignSelf: 'flex-start', fontWeight: 700 }}
              >
                View Detailed Inventory
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Health Score Gauge */}
        <Grid item xs={12} md={5}>
          <Card className="glass-card" sx={{ height: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              Overall Health Score
            </Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
              <CircularProgress
                variant="determinate"
                value={complianceScore}
                size={180}
                thickness={5}
                sx={{ 
                  color: complianceScore > 80 ? '#ACBFA4' : complianceScore > 50 ? '#E4A11B' : '#FF7F11',
                  filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.1))'
                }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h2" component="div" sx={{ fontWeight: 900, color: 'text.primary' }}>
                  {complianceScore}%
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', tracking: 1 }}>
                  COMPLIANT
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2, maxWidth: '80%' }}>
              {complianceScore === 100 
                ? "Perfect posture! All cloud resources meet security baselines." 
                : `Action required: ${100 - complianceScore}% of audited resources are currently non-compliant.`}
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
