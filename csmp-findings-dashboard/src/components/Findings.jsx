import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    Grid,
    ToggleButton,
    ToggleButtonGroup,
    Button
} from '@mui/material';
import {
    DataGrid,
    GridToolbarContainer,
    GridToolbarExport,
    GridToolbarFilterButton,
    GridToolbarColumnsButton,
} from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const API_BASE_URL = 'http://localhost:5000/api';

const formatISTDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
        let dateStr = String(dateVal);
        // If it doesn't look like an ISO string with time, append Z to force UTC interpretation
        if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
            dateStr += 'Z';
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        
        // India Standard Time (UTC+5:30)
        // Manual construction to be 100% sure of the format the user wants: DD/MM/YYYY hh:mm:ss AM/PM IST
        const formatter = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        
        const formatted = formatter.format(d).toUpperCase();
        // Replace the comma added by en-IN locale if needed, but the user example didn't have it
        return `${formatted.replace(',', '')} IST`;
    } catch (e) {
        return 'N/A';
    }
};

const Findings = ({ filter = '' }) => {
    const navigate = useNavigate();
    const [findings, setFindings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('active'); // 'active' or 'deleted'
    const [filters, setFilters] = useState({
        severity: filter || '',
        service: '',
        status: '',
        search: '',
    });
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 10,
        total: 0,
    });

    const fetchFindings = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page + 1,
                limit: pagination.pageSize,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
            });

            let endpoint = '/findings';
            if (viewMode === 'deleted') {
                endpoint = '/logs';
            }

            const response = await axios.get(`${API_BASE_URL}${endpoint}?${params}`);

            // Handle different response structures
            if (viewMode === 'deleted') {
                setFindings(response.data.logs || []);
            } else {
                setFindings(response.data.findings || []);
            }

            // Guard against pagination being undefined
            if (response.data.pagination) {
                setPagination(prev => ({
                    ...prev,
                    total: response.data.pagination.total || 0,
                }));
            }
            setError(null);
        } catch (err) {
            setError('Failed to fetch data. Please check if the backend server is running.');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFindings();
        const intervalId = setInterval(fetchFindings, 5000);
        return () => clearInterval(intervalId);
    }, [pagination.page, pagination.pageSize, filters, filter, viewMode]);

    const handleViewModeChange = (event, newMode) => {
        if (newMode !== null) {
            setViewMode(newMode);
            setPagination({ ...pagination, page: 0 }); // Reset page
        }
    };

    const handleClearHistory = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/logs`);
            fetchFindings(); // Refresh the list
        } catch (err) {
            console.error('Error clearing history:', err);
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

    const getStatusColor = (status) => {
        if (status === 'DELETED') return 'error';
        switch (status?.toLowerCase()) {
            case 'open': return 'error';
            case 'in_progress': return 'warning';
            case 'resolved': return 'success';
            default: return 'default';
        }
    };

    const columns = React.useMemo(() => [
        {
            field: 'severity',
            headerName: 'Severity',
            width: 100,
            renderCell: (params) => {
                const sev = params.value || 'N/A';
                return (
                    <Chip
                        label={sev}
                        color={getSeverityColor(sev)}
                        size="small"
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                    />
                );
            },
        },
        { 
            field: 'title', 
            headerName: 'Title', 
            flex: 1, 
            minWidth: 150,
            renderCell: (params) => params.value || params.row.title || 'Insecure Resource Detected'
        },
        { field: 'service', headerName: 'Service', width: 90 },
        { field: 'bucket_name', headerName: 'Resource ID', width: 150 },
        ...(viewMode === 'deleted' ? [
            {
                field: 'deleted_at',
                headerName: 'Deletion Time',
                width: 200,
                renderCell: (params) => formatISTDate(params.row.deleted_at || params.row.timestamp)
            }
        ] : [
            { field: 'resource_name', headerName: 'Resource', width: 150 },
            {
                field: 'status',
                headerName: 'Status',
                width: 110,
                renderCell: (params) => (
                    <Chip
                        label={params.value || 'Unknown'}
                        color={getStatusColor(params.value)}
                        size="small"
                        variant="outlined"
                    />
                ),
            }
        ]),
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/finding/${params.row._id}`)}
                        title="View Details"
                        color="primary"
                    >
                        <VisibilityIcon />
                    </IconButton>
                    {viewMode === 'deleted' && (
                        <IconButton
                            size="small"
                            onClick={() => navigate(`/reports?bucket=${params.row.bucket_name || params.row.resource_name}&deleted=true`)}
                            title="Generate Report"
                            color="secondary"
                        >
                            <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>R</Box>
                        </IconButton>
                    )}
                </Box>
            ),
        },
    ], [viewMode, navigate]);

    const CustomNoRowsOverlay = () => (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            opacity: 0.7 
        }}>
            <StorageIcon sx={{ fontSize: 60, mb: 1, color: '#FF7F11' }} />
            <Typography variant="h6">
                {viewMode === 'deleted' ? 'No Deleted Logs Found' : 'No Active Findings Found'}
            </Typography>
            <Typography variant="body2">
                {viewMode === 'deleted' 
                    ? 'Successfully remediated and deleted resources will appear here.' 
                    : 'System is currently secure. No critical misconfigurations detected.'}
            </Typography>
        </Box>
    );

    const CustomToolbar = () => (
        <GridToolbarContainer sx={{ p: 1, gap: 1 }}>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarExport />
        </GridToolbarContainer>
    );

    return (
        <Box className="fade-in">
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ color: 'text.primary' }}>
                    {filter === 'CRITICAL' ? 'Critical Security Issues' : 'Security Findings'}
                </Typography>

                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    aria-label="view mode"
                    color="primary"
                    sx={{ bgcolor: 'background.paper' }}
                >
                    <ToggleButton value="active" aria-label="active findings">
                        <StorageIcon sx={{ mr: 1 }} />
                        Active Findings
                    </ToggleButton>
                    <ToggleButton value="deleted" aria-label="deleted buckets logs">
                        <DeleteOutlineIcon sx={{ mr: 1 }} />
                        Deleted Logs
                    </ToggleButton>
                </ToggleButtonGroup>

                {viewMode === 'deleted' && (
                    <Button 
                        variant="contained" 
                        color="error" 
                        startIcon={<DeleteOutlineIcon />}
                        onClick={handleClearHistory}
                        sx={{ ml: 2 }}
                    >
                        Clear History
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Card className="glass-card" sx={{ mb: 4 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                        <FilterListIcon color="primary" />
                        <Typography variant="h6">Quick Filters</Typography>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                fullWidth
                                label="Search Keywords"
                                variant="outlined"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                sx={{ '& .MuiInputBase-root': { height: 56 } }}
                            />
                        </Grid>
                        {!filter && (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <FormControl fullWidth>
                                    <InputLabel shrink>Severity Level</InputLabel>
                                    <Select
                                        value={filters.severity}
                                        label="Severity Level"
                                        onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                                        sx={{ height: 56 }}
                                        displayEmpty
                                        notched
                                    >
                                        <MenuItem value="">All Levels</MenuItem>
                                        <MenuItem value="Critical">Critical</MenuItem>
                                        <MenuItem value="High">High</MenuItem>
                                        <MenuItem value="Medium">Medium</MenuItem>
                                        <MenuItem value="Low">Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel shrink>AWS Service</InputLabel>
                                <Select
                                    value={filters.service}
                                    label="AWS Service"
                                    onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                                    sx={{ height: 56 }}
                                    displayEmpty
                                    notched
                                >
                                    <MenuItem value="">All Services</MenuItem>
                                    <MenuItem value="S3">S3</MenuItem>
                                    <MenuItem value="KMS">KMS</MenuItem>
                                    <MenuItem value="EC2">EC2</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Card className="glass-card">
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={findings}
                        columns={columns}
                        getRowId={(row) => row._id}
                        paginationMode="server"
                        rowCount={pagination.total}
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
                        onPageSizeChange={(newPageSize) => setPagination(prev => ({ ...prev, pageSize: newPageSize }))}
                        loading={loading}
                        components={{
                            Toolbar: CustomToolbar,
                            NoRowsOverlay: CustomNoRowsOverlay,
                        }}
                        disableSelectionOnClick
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell:focus': { outline: 'none' },
                            '& .MuiDataGrid-columnHeader:focus': { outline: 'none' },
                        }}
                    />
                </Box>
            </Card>
        </Box>
    );
};

export default Findings;
