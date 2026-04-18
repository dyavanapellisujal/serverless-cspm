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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  
  // Dynamic data based on stats
  const trendData = stats?.total_findings > 0 ? [
    ...mockTrendData.slice(0, -1),
    { name: 'Present', findings: stats.total_findings }
  ] : mockTrendData;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/stats`);
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
          System At A Glance
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Real-time security posture monitoring for cloud infrastructure.
        </Typography>
      </Box>

      {/* Hero Stats */}
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

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Card className="glass-card" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Security Posture Trend</Typography>
              <Box sx={{ height: 300, mt: 2, mb: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorFindings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF7F11" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF7F11" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <YAxis 
                      hide 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="findings" 
                      stroke="#FF7F11" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorFindings)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/findings')}
                sx={{ fontWeight: 700 }}
              >
                Explore All Findings
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card className="glass-card" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top Affected Services</Typography>
              <Box sx={{ mt: 3 }}>
                {stats?.service_distribution?.map((service, index) => (
                  <Box key={index} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{service._id}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{service.count}</Typography>
                    </Box>
                    <Box sx={{
                      width: '100%',
                      height: 8,
                      bgcolor: 'rgba(0,0,0,0.05)',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{
                        width: `${(service.count / stats.total_findings) * 100}%`,
                        height: '100%',
                        bgcolor: index === 0 ? '#FF7F11' : '#ACBFA4'
                      }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
