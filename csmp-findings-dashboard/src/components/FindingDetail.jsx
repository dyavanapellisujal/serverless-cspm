import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const formatISTDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
        let dateStr = String(dateVal);
        if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
            dateStr += 'Z';
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Invalid Date';
        // Force IST interpretation
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }).toUpperCase() + ' IST';
    } catch (e) {
        return 'Invalid Date';
    }
};

const FindingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [remediateDialogOpen, setRemediateDialogOpen] = useState(false);
  const [remediateConfirm, setRemediateConfirm] = useState('');
  const [remediating, setRemediating] = useState(false);
  const [remediationError, setRemediationError] = useState(null);

  useEffect(() => {
    fetchFinding();
  }, [id]);

  const fetchFinding = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/findings/${id}`);
      setFinding(response.data);
      setNewStatus(response.data.status);
      setError(null);
    } catch (err) {
      setError('Failed to fetch finding details.');
      console.error('Error fetching finding:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    try {
      await axios.put(`${API_BASE_URL}/findings/${id}/status`, {
        status: newStatus,
      });
      setFinding({ ...finding, status: newStatus });
      setStatusDialogOpen(false);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };
  
  const handleRemediate = async () => {
    if (remediateConfirm !== 'DELETE') {
      setRemediationError('Please type DELETE to confirm.');
      return;
    }
    
    try {
      setRemediating(true);
      setRemediationError(null);
      const response = await axios.post(`${API_BASE_URL}/findings/${id}/remediate`, {
        confirmation: remediateConfirm
      });
      // If successful, the finding is moved to logs. Redirect to logs or home.
      setRemediateDialogOpen(false);
      navigate('/reports?bucket=' + (finding.resource_name || finding.bucket_name || finding.resource_id) + '&deleted=true');
    } catch (err) {
      setRemediationError(err.response?.data?.error || 'Failed to remediate resource.');
      console.error('Remediation error:', err);
    } finally {
      setRemediating(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return <ErrorIcon />;
      case 'HIGH': return <WarningIcon />;
      case 'MEDIUM': return <InfoIcon />;
      case 'LOW': return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'false_positive': return 'default';
      default: return 'default';
    }
  };

  const getRecommendations = (finding) => {
    const recommendations = [];

    if (finding?.service === 'S3') {
      if (finding?.title?.includes('public')) {
        recommendations.push({
          title: 'Restrict Public Access',
          description: 'Configure bucket policies to deny public read/write access unless specifically required.',
          priority: 'High',
        });
        recommendations.push({
          title: 'Enable Access Logging',
          description: 'Enable S3 access logging to monitor and audit bucket access patterns.',
          priority: 'Medium',
        });
      }
      if (finding?.title?.includes('encryption')) {
        recommendations.push({
          title: 'Enable Server-Side Encryption',
          description: 'Configure default encryption for the S3 bucket using AES-256 or KMS.',
          priority: 'High',
        });
      }
      // Added per user request: delete option
      recommendations.push({
        title: 'Remediate: Delete S3 Bucket',
        description: 'The most effective way to eliminate risk for unauthorized resources is to completely delete the bucket and its contents.',
        priority: 'Critical',
      });
    }

    if (finding?.service === 'EC2') {
      recommendations.push({
        title: 'Review Security Groups',
        description: 'Ensure security groups follow the principle of least privilege.',
        priority: 'High',
      });
      recommendations.push({
        title: 'Remediate: Terminate Instance',
        description: 'If the instance is compromised or unauthorized, terminate it immediately to prevent lateral movement.',
        priority: 'Critical',
      });
    }

    if (finding?.service === 'IAM') {
      recommendations.push({
        title: 'Apply Least Privilege',
        description: 'Review and reduce permissions to the minimum required.',
        priority: 'High',
      });
      recommendations.push({
        title: 'Remediate: Delete IAM Entity',
        description: 'Delete unauthorized IAM users, groups, or roles to prevent unauthorized access to your cloud environment.',
        priority: 'Critical',
      });
    }

    if (finding?.service === 'KMS') {
      recommendations.push({
        title: 'Remediate: Schedule Key Deletion',
        description: 'If a KMS key is insecure or exposed, schedule it for deletion to prevent its further use.',
        priority: 'Critical',
      });
    }

    // Default recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Review Configuration',
        description: 'Review the resource configuration against security best practices.',
        priority: 'Medium',
      });
      recommendations.push({
        title: 'Monitor Changes',
        description: 'Set up monitoring and alerting for configuration changes.',
        priority: 'Low',
      });
    }

    return recommendations;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (!finding) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Finding not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const recommendations = getRecommendations(finding);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4">
            Finding Details
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setStatusDialogOpen(true)}
        >
          Update Status
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Main Finding Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getSeverityIcon(finding.severity)}
                <Typography variant="h5" component="h1">
                  {finding.title}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Chip
                  label={finding.severity}
                  color={getSeverityColor(finding.severity)}
                  variant="outlined"
                />
                <Chip
                  label={finding.status}
                  color={getStatusColor(finding.status)}
                />
                <Chip
                  label={finding.service}
                  icon={<CloudIcon />}
                  variant="outlined"
                />
              </Box>

              <Typography variant="body1" paragraph>
                <strong>Security Alert:</strong> {finding.description} <br /><br />
                <em>Note: This configuration was detected in near real-time. Unrestricted or misconfigured access policies expose your infrastructure to severe risks including data exfiltration, unauthorized privilege escalation, or unauthorized network ingress.</em>
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Resource ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {finding.resource_name || finding.bucket_name || finding.resource_id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Region
                  </Typography>
                  <Typography variant="body2">
                    {finding.region || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Account ID
                  </Typography>
                  <Typography variant="body2">
                    {finding.account_id || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Detected At
                  </Typography>
                  <Typography variant="body2">
                    {formatISTDate(finding.timestamp || finding.deleted_at)}
                  </Typography>
                </Grid>
                {finding.is_archived_log && finding.deleted_at && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="error">
                      Deletion / Remediation Time
                    </Typography>
                    <Typography variant="body2" color="error">
                      {formatISTDate(finding.deleted_at)}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {finding.details && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Additional Details
                  </Typography>
                  <Box sx={{ backgroundColor: 'rgba(172, 191, 164, 0.1)', p: 2, borderRadius: 2, border: '1px solid rgba(172, 191, 164, 0.2)' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: '#262626' }}>
                      {JSON.stringify(finding.details, null, 2)}
                    </pre>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar with Recommendations */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon />
                Security Recommendations
              </Typography>

              <List>
                {recommendations.map((rec, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Chip
                        label={rec.priority}
                        size="small"
                        color={rec.priority === 'High' ? 'error' : rec.priority === 'Medium' ? 'warning' : 'default'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={rec.title}
                      secondary={rec.description}
                      primaryTypographyProps={{ variant: 'subtitle2' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  fullWidth
                >
                  View in AWS Console
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  fullWidth
                  onClick={() => setRemediateDialogOpen(true)}
                >
                  Remediate (Delete)
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AssignmentIcon />}
                  fullWidth
                  onClick={() => navigate(`/reports?finding_id=${id}`)}
                >
                  Generate Report
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Finding Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus || ''}
              label="Status"
              onChange={(e) => setNewStatus(e?.target?.value || '')}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="false_positive">False Positive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={updateStatus} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Remediation Dialog */}
      <Dialog 
        open={remediateDialogOpen} 
        onClose={() => !remediating && setRemediateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Confirm Destructive Remediation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You are about to perform a <strong>DESTRUCTIVE</strong> action. 
            This will attempt to delete or terminate the resource: 
            <Box component="span" sx={{ fontFamily: 'monospace', mx: 1, p: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              {finding.resource_name || finding.bucket_name || finding.resource_id}
            </Box>
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 3 }}>
            This action cannot be undone. All data within the resource will be lost. 
            The finding will be archived in the logs once the action is complete.
          </Alert>
          
          <Typography variant="body2" gutterBottom>
            To confirm this action, please type <strong>DELETE</strong> below:
          </Typography>
          
          <TextField
            fullWidth
            size="small"
            value={remediateConfirm}
            onChange={(e) => setRemediateConfirm(e.target.value)}
            placeholder="Type DELETE here"
            error={!!remediationError}
            helperText={remediationError}
            disabled={remediating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemediateDialogOpen(false)} disabled={remediating}>
            Cancel
          </Button>
          <Button 
            onClick={handleRemediate} 
            variant="contained" 
            color="error"
            disabled={remediating || remediateConfirm !== 'DELETE'}
            startIcon={remediating ? <CircularProgress size={20} color="inherit" /> : <DeleteOutlineIcon />}
          >
            {remediating ? 'Processing...' : 'Delete Resource'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FindingDetail;