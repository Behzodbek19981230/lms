import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Button,
  Alert,
  Container,
  Paper,
  Grid,
  Chip,
  Avatar,
} from '@mui/material';
import {
  HourglassEmpty,
  AdminPanelSettings,
  School,
  ContactSupport,
  Refresh,
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingCenterAssignment: React.FC = () => {
  const { user, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserData();
      setLastRefresh(new Date());
      
      // Check if user now has center assigned
      if (user?.center) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    // Auto refresh every 30 seconds
    const interval = setInterval(handleRefresh, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        py={4}
      >
        <Paper elevation={3} sx={{ width: '100%', p: 4 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <HourglassEmpty />
              </Avatar>
              <Typography variant="h4" component="h1" color="warning.main">
                Kutilmoqda...
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ExitToApp />}
              onClick={handleLogout}
              size="small"
            >
              Chiqish
            </Button>
          </Box>

          {/* User Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60 }}>
                    {user.firstName[0]}{user.lastName?.[0]}
                  </Avatar>
                </Grid>
                <Grid item xs>
                  <Typography variant="h6" gutterBottom>
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    @{user.username}
                  </Typography>
                  <Chip 
                    label={user.role === 'student' ? 'Talaba' : user.role === 'teacher' ? "O'qituvchi" : 'Admin'} 
                    color="primary" 
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Main Alert */}
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            icon={<School />}
          >
            <Typography variant="h6" gutterBottom>
              Sizga hali markaz biriktirilmagan
            </Typography>
            <Typography>
              Tizimdan to'liq foydalanish uchun administrator tomonidan sizga markaz biriktirilishi kerak.
            </Typography>
          </Alert>

          {/* Instructions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <AdminPanelSettings sx={{ mr: 1, verticalAlign: 'middle' }} />
                Keyingi qadamlar
              </Typography>
              
              <Box component="ol" sx={{ pl: 2, mt: 2 }}>
                <Box component="li" sx={{ mb: 2 }}>
                  <Typography>
                    <strong>Administrator bilan bog'laning:</strong> O'quv markazingizning administratori yoki IT xodimi bilan bog'laning
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 2 }}>
                  <Typography>
                    <strong>Ma'lumotlaringizni taqdim eting:</strong> Ismingiz va foydalanuvchi nomingiz: <code>@{user.username}</code>
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 2 }}>
                  <Typography>
                    <strong>Kutib turing:</strong> Administrator sizni tegishli markazga biriktiradi
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography>
                    <strong>Sahifani yangilang:</strong> Biriktirish jarayoni tugagach, bu sahifa avtomatik yangilanadi
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Actions */}
          <Box display="flex" gap={2} justifyContent="center" alignItems="center">
            <Button
              variant="contained"
              color="primary"
              startIcon={isRefreshing ? <CircularProgress size={16} /> : <Refresh />}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Tekshirilmoqda...' : 'Holatni tekshirish'}
            </Button>
            
            <Button
              variant="outlined"
              color="info"
              startIcon={<ContactSupport />}
              onClick={() => window.open('tel:+998900000000', '_self')}
            >
              Yordam
            </Button>
          </Box>

          {/* Last Refresh Info */}
          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="textSecondary">
              Oxirgi tekshiruv: {lastRefresh.toLocaleTimeString('uz-UZ')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Avtomatik yangilanish: har 30 soniyada
            </Typography>
          </Box>

          {/* Support Info */}
          <Card sx={{ mt: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="body2" color="textSecondary" textAlign="center">
                <strong>Yordam kerakmi?</strong><br />
                Agar uzun vaqt davomida markaz biriktirilmasa, quyidagi raqamga qo'ng'iroq qiling:<br />
                📞 <strong>+998 (90) 000-00-00</strong> - Texnik yordam
              </Typography>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    </Container>
  );
};

export default PendingCenterAssignment;
