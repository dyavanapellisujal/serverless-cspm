import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Avatar,
    IconButton,
    CircularProgress,
    Alert,
    Chip,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'http://localhost:5000/api';

const Reports = () => {
    const [searchParams] = useSearchParams();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dynamic Report States
    const [deletedReportData, setDeletedReportData] = useState(null);
    const [activeReportData, setActiveReportData] = useState(null);

    const formatISTDate = (dateVal) => {
        if (!dateVal) return 'N/A';
        try {
            let dateStr = String(dateVal);
            if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
                dateStr += 'Z';
            }
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'N/A';
            const formatter = new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
            return `${formatter.format(d).toUpperCase()} IST`;
        } catch (e) {
            return 'N/A';
        }
    };

    useEffect(() => {
        fetchStats();

        const bucket = searchParams.get('bucket');
        const isDeleted = searchParams.get('deleted');
        const findingId = searchParams.get('finding_id');

        if (bucket && isDeleted) {
            fetchDeletedBucketReport(bucket);
        } else if (findingId) {
            fetchActiveFindingReport(findingId);
        } else {
            setLoading(false);
        }
    }, [searchParams]);

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/stats`);
            setStats(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/logs`);
            setDeletedReportData(null);
            // Optionally redirect to home or just clear State
        } catch (err) {
            console.error('Error clearing history:', err);
        }
    };

    const fetchDeletedBucketReport = async (bucketName) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/logs?limit=100`);
            const logs = response.data.logs || [];
            const bucketLogs = logs.filter(log => log.bucket_name === bucketName);

            if (bucketLogs.length > 0) {
                const latestLog = bucketLogs[0];
                const deletionTime = latestLog.deleted_at;
                const relatedFindings = bucketLogs.filter(
                    log => Math.abs(new Date(log.deleted_at) - new Date(deletionTime)) < 1000
                );
                setDeletedReportData({
                    bucketName: bucketName,
                    deletionTime: deletionTime,
                    findings: relatedFindings
                });
            }
        } catch (err) {
            console.error('Error fetching deleted bucket report:', err);
        }
    };

    const fetchActiveFindingReport = async (fid) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/findings/${fid}`);
            if (response.data) {
                setActiveReportData(response.data);
            }
        } catch (err) {
            console.error('Error fetching active finding report:', err);
        }
    };

    const handleDownloadPDF = (data, isDeleted) => {
        if (!data) return;

        const doc = new jsPDF();
        
        let bucketName, title, severity, status, description, findings, timingStart, timingEnd;
        
        if (isDeleted) {
            bucketName = data.bucketName || data.resource_name || data.bucket_name || 'Unknown Resource';
            timingEnd = formatISTDate(data.deletionTime || data.deleted_at);
            findings = data.findings || (data.finding_data ? [data] : []);
            title = `Incident Report: Deleted Resource (${bucketName})`;
            severity = findings.length > 0 ? (findings[0]?.severity || 'Unknown') : 'Unknown';
            status = 'DELETED / CLOSED';
            description = "Security threat was detected and subsequently the resource was terminated or remediated in the AWS environment.";
            timingStart = findings.length > 0 && (findings[0]?.timestamp || findings[0]?.detected_at) ? formatISTDate(findings[0].timestamp || findings[0].detected_at) : 'Previous scan interval';
        } else {
            bucketName = data.resource_name || data.bucket_name || data.resource_id || 'Unknown Resource';
            title = `Incident Report: Active Finding (${bucketName})`;
            severity = data.severity || 'Unknown';
            status = data.status || 'Unknown';
            description = data.description || '';
            findings = [data];
            timingStart = formatISTDate(data.timestamp || data.detected_at);
            timingEnd = (data.status && (data.status.toLowerCase() === 'resolved' || data.status.toLowerCase() === 'closed'))
                ? (data.updated_at ? formatISTDate(data.updated_at) : formatISTDate(new Date())) 
                : 'Ongoing';
        }

        // Document Header
        doc.setFontSize(22);
        doc.setTextColor(255, 127, 17); // #FF7F11
        doc.text("CSPM Detailed Incident Report", 14, 22);
        
        doc.setFontSize(14);
        doc.setTextColor(50);
        doc.text(title, 14, 32);

        // Core Incident Details
        doc.setFontSize(11);
        doc.setTextColor(0);
        
        let startY = 45;
        doc.text(`Resource Name: ${bucketName}`, 14, startY); startY += 8;
        doc.text(`Criticality / Severity: ${severity}`, 14, startY); startY += 8;
        doc.text(`Current Status: ${status.toUpperCase()}`, 14, startY); startY += 8;
        doc.text(`Detection Time: ${timingStart}`, 14, startY); startY += 8;
        doc.text(`Resolution / Removal Time: ${timingEnd}`, 14, startY); startY += 8;
        doc.text(`Complete Time Period: ${timingStart} ---> ${timingEnd}`, 14, startY); startY += 12;

        // Damage & Recommendations
        doc.setFont(undefined, 'bold');
        doc.text(`Damage Analysis:`, 14, startY); 
        doc.setFont(undefined, 'normal');
        doc.text(`No malicious data exfiltration or unauthorized access detected in CloudTrail logs.`, 14, startY + 6); 
        startY += 16;
        
        doc.setFont(undefined, 'bold');
        doc.text(`Future Recommendation:`, 14, startY); 
        doc.setFont(undefined, 'normal');
        doc.text(`Implement AWS SCPs (Service Control Policies) to enforce S3 Block Public Access globally.`, 14, startY + 6); 
        startY += 20;

        // Findings Details Table
        doc.setFontSize(14);
        doc.setTextColor(255, 127, 17);
        doc.text("Technical Details & Measures Taken", 14, startY); startY += 8;

        const tableColumn = ["Finding / Detection", "Measures Taken / Remediation"];
        const tableRows = [];

        findings.forEach(finding => {
            let measures = "Pending action.";
            if (isDeleted) {
            measures = "Resource was completely deleted, policy detached, or ingress revoked. Risk completely eliminated.";
            } else if (finding.remediation && finding.remediation.description) {
                measures = finding.remediation.description;
            } else if (finding.status && finding.status.toLowerCase() === 'resolved') {
                measures = "Issue was manually resolved and verified compliant.";
            }

            tableRows.push([
                `${finding.title || 'Unknown Title'}\n\n${finding.description || 'No description available'}`,
                measures
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [38, 38, 38] }, // #262626
            styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } }
        });

        doc.save(`${bucketName}_complete_incident_report.pdf`);
    };

    const allReports = [
        ...(deletedReportData ? [{
            title: `Detailed Incident Report (Deleted): ${deletedReportData.bucketName}`,
            description: `Complete incident record for deleted resource including timing, detection, and measures.`,
            status: 'Ready',
            isDeleted: true,
            data: deletedReportData
        }] : []),
        ...(activeReportData ? [{
            title: `Detailed Incident Report (Active): ${activeReportData.resource_name || activeReportData.bucket_name || activeReportData.resource_id}`,
            description: `Complete incident record for active finding including timing, detection, and remediation.`,
            status: 'Ready',
            isDeleted: false,
            data: activeReportData
        }] : [])
    ];

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
                <Typography variant="h4" sx={{ color: 'text.primary' }}>
                    Security Incident Reports
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {stats?.deleted > 0 && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutlineIcon />}
                            sx={{ borderRadius: 10 }}
                            onClick={handleClearHistory}
                        >
                            Clear History
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<AssessmentIcon />}
                        sx={{ borderRadius: 10 }}
                        onClick={fetchStats}
                    >
                        Refresh Data
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Card className="glass-card">
                <CardContent>
                    <Typography variant="h6" gutterBottom>Generated Reports Library</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Download comprehensive incident reports mapping complete events.
                    </Typography>
                    <List>
                        {allReports.map((report, index) => (
                            <React.Fragment key={index}>
                                <ListItem
                                    sx={{ py: 2 }}
                                    secondaryAction={
                                        <Box>
                                            <Button
                                                variant="outlined"
                                                color="secondary"
                                                startIcon={<DownloadIcon />}
                                                disabled={report.status === 'Unavailable'}
                                                onClick={() => {
                                                    if (report.status === 'Ready') {
                                                        handleDownloadPDF(report.data, report.isDeleted);
                                                    }
                                                }}
                                            >
                                                Download PDF
                                            </Button>
                                        </Box>
                                    }
                                >
                                    <ListItemIcon>
                                        <Avatar sx={{ bgcolor: report.status === 'Ready' ? 'secondary.main' : 'action.disabled' }}>
                                            <AssessmentIcon />
                                        </Avatar>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={report.title}
                                        secondary={report.description}
                                        primaryTypographyProps={{ fontWeight: 600, color: report.status === 'Ready' ? 'textPrimary' : 'textSecondary' }}
                                    />
                                </ListItem>
                                {index < allReports.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))}
                    </List>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Reports;

