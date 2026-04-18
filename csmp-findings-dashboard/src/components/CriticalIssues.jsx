import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorIcon from '@mui/icons-material/Error';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

const API_BASE_URL = 'http://localhost:5000/api';

const CriticalIssues = () => {
    const navigate = useNavigate();
    const [findings, setFindings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCriticalFindings();
    }, []);

    const fetchCriticalFindings = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/findings?severity=CRITICAL`);
            setFindings(response.data.findings);
            setError(null);
        } catch (err) {
            setError('Failed to fetch critical findings. Please check if the backend server is running.');
            console.error('Error fetching findings:', err);
        } finally {
            setLoading(false);
        }
    };

    const getRemediationSteps = (finding) => {
        const steps = [];

        if (finding.service === 'S3' && (finding.title.includes('Public Access') || finding.description.includes('Public Access'))) {
            steps.push({
                title: 'Block All Public Access',
                description: 'Navigate to S3 console → Select bucket → Permissions → Block public access → Enable all 4 options',
                priority: 'Critical',
                awsCli: `aws s3api put-public-access-block --bucket ${finding.resource_name} --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`,
            });
            steps.push({
                title: 'Review Bucket Policy',
                description: 'Check and remove any policies that grant public access',
                priority: 'High',
            });
        } else if (finding.service === 'EC2' && finding.title.includes('SSH')) {
            steps.push({
                title: 'Revoke Unrestricted SSH Access',
                description: 'EC2 Console → Security Groups → Select Group → Edit Inbound Rules → Remove 0.0.0.0/0 on port 22',
                priority: 'Critical',
                awsCli: `aws ec2 revoke-security-group-ingress --group-id ${finding.resource_name} --protocol tcp --port 22 --cidr 0.0.0.0/0`,
            });
            steps.push({
                title: 'Restrict Access to Known IPs',
                description: 'Modify SSH rules to only allow specific IP ranges (e.g., your corporate VPN)',
                priority: 'High',
            });
        } else if (finding.service === 'KMS') {
            steps.push({
                title: 'Restrict KMS Key Policy',
                description: 'KMS Console → Customer managed keys → Select key → Key policy → Change Principal from "*" to specific IAM roles',
                priority: 'Critical',
            });
            steps.push({
                title: 'Enable Key Rotation',
                description: 'KMS Console → Customer managed keys → Select key → Key rotation → Enable',
                priority: 'High',
            });
        }

        return steps;
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Critical': return 'error';
            case 'High': return 'warning';
            case 'Medium': return 'info';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box className="fade-in">
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorIcon color="error" />
                        Critical Security Issues
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                        {findings.length} critical {findings.length === 1 ? 'issue' : 'issues'} requiring immediate attention
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    onClick={fetchCriticalFindings}
                    startIcon={<WarningIcon />}
                >
                    Refresh
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {findings.length === 0 ? (
                <Card className="glass-card">
                    <CardContent sx={{ textAlign: 'center', py: 8 }}>
                        <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                            No Critical Issues Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Your infrastructure is currently free of critical security findings.
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {findings.map((finding) => {
                        const remediationSteps = getRemediationSteps(finding);
                        return (
                            <Grid item xs={12} key={finding._id}>
                                <Card className="glass-card" sx={{ border: '2px solid', borderColor: 'error.main' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <Chip label={finding.severity} color="error" size="small" sx={{ fontWeight: 600 }} />
                                                    <Chip label={finding.service} variant="outlined" size="small" />
                                                    <Chip
                                                        label={finding.status}
                                                        color={finding.status === 'Open' ? 'error' : 'warning'}
                                                        variant="outlined"
                                                        size="small"
                                                    />
                                                </Box>
                                                <Typography variant="h6" gutterBottom>
                                                    {finding.title}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                    {finding.description}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Resource: {finding.resource_name} • Region: {finding.region}
                                                </Typography>
                                            </Box>
                                            <IconButton
                                                color="primary"
                                                onClick={() => navigate(`/finding/${finding._id}`)}
                                                title="View Full Details"
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Box>

                                        <Accordion
                                            sx={{
                                                mt: 2,
                                                bgcolor: 'rgba(255, 127, 17, 0.05)',
                                                '&:before': { display: 'none' }
                                            }}
                                        >
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <BuildIcon color="primary" />
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                        Remediation Steps ({remediationSteps.length})
                                                    </Typography>
                                                </Box>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <List>
                                                    {remediationSteps.map((step, index) => (
                                                        <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, width: '100%' }}>
                                                                <ListItemIcon sx={{ minWidth: 'auto' }}>
                                                                    <Chip
                                                                        label={`Step ${index + 1}`}
                                                                        size="small"
                                                                        color="primary"
                                                                        sx={{ fontWeight: 600 }}
                                                                    />
                                                                </ListItemIcon>
                                                                <ListItemText
                                                                    primary={step.title}
                                                                    primaryTypographyProps={{ fontWeight: 600 }}
                                                                />
                                                                <Chip
                                                                    label={step.priority}
                                                                    color={getPriorityColor(step.priority)}
                                                                    size="small"
                                                                />
                                                            </Box>
                                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 6, mb: 1 }}>
                                                                {step.description}
                                                            </Typography>
                                                            {step.awsCli && (
                                                                <Box
                                                                    sx={{
                                                                        ml: 6,
                                                                        p: 1.5,
                                                                        bgcolor: '#262626',
                                                                        borderRadius: 1,
                                                                        width: 'calc(100% - 48px)',
                                                                        fontFamily: 'monospace',
                                                                        fontSize: '0.85rem',
                                                                        color: '#ACBFA4',
                                                                        overflowX: 'auto'
                                                                    }}
                                                                >
                                                                    $ {step.awsCli}
                                                                </Box>
                                                            )}
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </AccordionDetails>
                                        </Accordion>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
};

export default CriticalIssues;
