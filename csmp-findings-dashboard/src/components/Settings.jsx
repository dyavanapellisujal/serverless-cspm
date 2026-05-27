import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Switch,
    FormControlLabel,
    TextField,
    Button,
    Divider,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloudIcon from '@mui/icons-material/Cloud';
import SecurityIcon from '@mui/icons-material/Security';

const Settings = () => {
    const [settings, setSettings] = useState({
        realTimeMonitoring: true,
        notificationEmails: 'admin@cspm-demo.com',
        alertSeverity: 'HIGH',
        awsRegion: 'ap-south-1',
        autoRemediation: false,
        retentionDays: 30,
    });
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Box className="fade-in">
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ color: 'text.primary', mb: 1 }}>
                    System Settings
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Configure your CSPM platform parameters and notification preferences.
                </Typography>
            </Box>

            {saved && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaved(false)}>
                    Settings saved successfully!
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card className="glass-card">
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CloudIcon color="primary" /> Cloud Configuration
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Primary AWS Region</InputLabel>
                                    <Select
                                        value={settings.awsRegion}
                                        label="Primary AWS Region"
                                        onChange={(e) => setSettings({ ...settings, awsRegion: e.target.value })}
                                    >
                                        <MenuItem value="ap-south-1">Asia Pacific (Mumbai)</MenuItem>
                                        <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
                                        <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
                                        <MenuItem value="eu-central-1">Europe (Frankfurt)</MenuItem>
                                    </Select>
                                </FormControl>
                                
                                <FormControlLabel
                                    control={
                                        <Switch 
                                            checked={settings.realTimeMonitoring}
                                            onChange={(e) => setSettings({ ...settings, realTimeMonitoring: e.target.checked })}
                                            color="primary"
                                        />
                                    }
                                    label="Enable Real-Time EventBridge Monitoring"
                                />
                                
                                <TextField
                                    label="Log Retention (Days)"
                                    type="number"
                                    value={settings.retentionDays}
                                    onChange={(e) => setSettings({ ...settings, retentionDays: e.target.value })}
                                    fullWidth
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card className="glass-card">
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <NotificationsIcon color="primary" /> Notification Settings
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <TextField
                                    label="Alert Notification Email"
                                    value={settings.notificationEmails}
                                    onChange={(e) => setSettings({ ...settings, notificationEmails: e.target.value })}
                                    fullWidth
                                />
                                
                                <FormControl fullWidth>
                                    <InputLabel>Minimum Alert Severity</InputLabel>
                                    <Select
                                        value={settings.alertSeverity}
                                        label="Minimum Alert Severity"
                                        onChange={(e) => setSettings({ ...settings, alertSeverity: e.target.value })}
                                    >
                                        <MenuItem value="CRITICAL">Critical Only</MenuItem>
                                        <MenuItem value="HIGH">High and Above</MenuItem>
                                        <MenuItem value="MEDIUM">Medium and Above</MenuItem>
                                        <MenuItem value="LOW">All Findings</MenuItem>
                                    </Select>
                                </FormControl>

                                <Box sx={{ p: 2, bgcolor: 'rgba(255, 127, 17, 0.05)', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                        Integration Hint
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        To enable <strong>Slack</strong> or <strong>Microsoft Teams</strong> notifications, configure the Webhook URL in the backend <code>.env</code> file.
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card className="glass-card">
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityIcon color="primary" /> Advanced Security & Remediation
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={8}>
                                    <FormControlLabel
                                        control={
                                            <Switch 
                                                checked={settings.autoRemediation}
                                                onChange={(e) => setSettings({ ...settings, autoRemediation: e.target.checked })}
                                                color="error"
                                            />
                                        }
                                        label="Enable Auto-Remediation (Experimental)"
                                    />
                                    <Typography variant="body2" color="textSecondary">
                                        If enabled, the system will automatically terminate resources that violate critical policies (e.g., Public S3 folders with PCI data). Use with extreme caution.
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<SaveIcon />}
                                        size="large"
                                        onClick={handleSave}
                                        sx={{ px: 4 }}
                                    >
                                        Save All Changes
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Settings;
