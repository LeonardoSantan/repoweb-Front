import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Navbar, Nav, Button, Spinner } from 'react-bootstrap';
import { useAuth, USER_ROLES, AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faExclamationTriangle, faSignOutAlt, faCalendarAlt,
  faUserInjured, faUserMd, faHospital, faStar, faUsers, faClipboard
} from '@fortawesome/free-solid-svg-icons';

import Login from './pages/Login';
import Home from './pages/Home';
import Patients from './pages/Patients';
import DoctorsList from './pages/Doctors/DoctorsList';
import DoctorForm from './pages/Doctors/DoctorForm';
import ClinicsList from './pages/Clinics/ClinicsList';
import ClinicForm from './pages/Clinics/ClinicForm';
import Specialties from './pages/Specialties';
import UsersList from './pages/Users/UsersList';
import UserForm from './pages/Users/UserForm';
import AppointmentsList from './pages/Appointments/AppointmentsList';
import AppointmentForm from './pages/Appointments/AppointmentForm';
import Prontuarios from './pages/Prontuarios';

const fullScreenCenteredStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 'calc(100vh - 56px)',
  flexDirection: 'column',
  gap: '1rem',
  paddingTop: '56px',
  paddingBottom: '2rem',
};

// Componente para rotas protegidas com log detalhado
function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, hasRole, loading, userRole } = useAuth();
  const location = useLocation();

  // Diagnóstico completo!
  console.log('[ProtectedRoute] pathname:', location.pathname);
  console.log('isAuthenticated:', isAuthenticated);
  console.log('loading:', loading);
  console.log('userRole:', userRole);
  console.log('roles (esperadas):', roles);
  console.log('hasRole(roles):', hasRole(roles));
  console.log('localStorage userRole:', localStorage.getItem('userRole'));

  if (loading) {
    return (
      <div style={fullScreenCenteredStyle}>
        <Spinner animation="border" />
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Não autenticado. Redirecionando para /login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !hasRole(roles)) {
    console.log('[ProtectedRoute] Acesso negado! userRole:', userRole, 'roles necessários:', roles);
    return (
      <div style={fullScreenCenteredStyle}>
        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-warning" />
        <h4>Acesso não autorizado</h4>
        <p>
          Seu papel: <b>{userRole || 'N/D'}</b><br />
          Roles aceitas: <b>{roles.join(', ')}</b>
        </p>
        <Button as={Link} to="/dashboard" className="mt-3">
          Voltar para Home
        </Button>
      </div>
    );
  }

  return children;
}

function AppRoutesContent() {
  const { isAuthenticated, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {isAuthenticated ? (
        <Navbar bg="dark" variant="dark" expand="lg" className="fixed-top shadow app-navbar">
          <Container>
            <Navbar.Brand as={Link} to="/dashboard">
              <FontAwesomeIcon icon={faHome} className="me-2" />
              Sistema Médico
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/dashboard">
                  <FontAwesomeIcon icon={faHome} className="me-1" />Home
                </Nav.Link>
                {(userRole === USER_ROLES.ADMIN ||
                  userRole === USER_ROLES.DOCTOR ||
                  userRole === USER_ROLES.RECEPTIONIST ||
                  userRole === USER_ROLES.PATIENT) && (
                  <Nav.Link as={Link} to="/appointments">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />Agendamentos
                  </Nav.Link>
                )}
                {userRole === USER_ROLES.ADMIN && (
                  <>
                    <Nav.Link as={Link} to="/patients">
                      <FontAwesomeIcon icon={faUserInjured} className="me-1" />Pacientes
                    </Nav.Link>
                    <Nav.Link as={Link} to="/doctors">
                      <FontAwesomeIcon icon={faUserMd} className="me-1" />Médicos
                    </Nav.Link>
                    <Nav.Link as={Link} to="/clinics">
                      <FontAwesomeIcon icon={faHospital} className="me-1" />Clínicas
                    </Nav.Link>
                    <Nav.Link as={Link} to="/specialties">
                      <FontAwesomeIcon icon={faStar} className="me-1" />Especialidades
                    </Nav.Link>
                    <Nav.Link as={Link} to="/users">
                      <FontAwesomeIcon icon={faUsers} className="me-1" />Usuários
                    </Nav.Link>
                  </>
                )}
                {(userRole === USER_ROLES.ADMIN ||
                  userRole === USER_ROLES.DOCTOR ||
                  userRole === USER_ROLES.PATIENT) && (
                  <Nav.Link as={Link} to="/prontuarios">
                    <FontAwesomeIcon icon={faClipboard} className="me-1" />Prontuários
                  </Nav.Link>
                )}
              </Nav>
              <Nav>
                <Navbar.Text className="me-3">
                  Logado como: <strong>{userRole || 'Carregando...'}</strong>
                </Navbar.Text>
                <Button variant="outline-light" onClick={handleLogout}>
                  <FontAwesomeIcon icon={faSignOutAlt} /> Sair
                </Button>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      ) : null}

      <div className="main-content" style={isAuthenticated ? { marginTop: '56px' } : {}}>
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><Patients /></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><DoctorsList /></ProtectedRoute>} />
          <Route path="/doctors/new" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><DoctorForm /></ProtectedRoute>} />
          <Route path="/doctors/:id/edit" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><DoctorForm /></ProtectedRoute>} />
          <Route path="/clinics" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><ClinicsList /></ProtectedRoute>} />
          <Route path="/clinics/new" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><ClinicForm /></ProtectedRoute>} />
          <Route path="/clinics/:id/edit" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><ClinicForm /></ProtectedRoute>} />
          <Route path="/specialties" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><Specialties /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><UsersList /></ProtectedRoute>} />
          <Route path="/users/new" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><UserForm /></ProtectedRoute>} />
          <Route path="/users/edit/:id" element={<ProtectedRoute roles={[USER_ROLES.ADMIN]}><UserForm /></ProtectedRoute>} />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute roles={[
                USER_ROLES.ADMIN,
                USER_ROLES.DOCTOR,
                USER_ROLES.RECEPTIONIST,
                USER_ROLES.PATIENT
              ]}>
                <AppointmentsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/new"
            element={
              <ProtectedRoute roles={[
                USER_ROLES.ADMIN, USER_ROLES.DOCTOR,
                USER_ROLES.RECEPTIONIST, USER_ROLES.PATIENT
              ]}>
                <AppointmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/edit/:id"
            element={
              <ProtectedRoute roles={[
                USER_ROLES.ADMIN, USER_ROLES.DOCTOR, USER_ROLES.RECEPTIONIST
              ]}>
                <AppointmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prontuarios"
            element={
              <ProtectedRoute roles={[
                USER_ROLES.ADMIN, USER_ROLES.DOCTOR, USER_ROLES.PATIENT
              ]}>
                <Prontuarios />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutesContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
