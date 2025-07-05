import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Button,
  Spinner,
  Alert,
  Badge,
  Card,
  Row,
  Col,
  Form,
  InputGroup,
} from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Person,
  GeoAlt,
  Pencil,
  Trash,
  Plus,
  Funnel,
  XCircle,
  PersonBadgeFill
} from 'react-bootstrap-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import api from '../../services/api';
import patientService from '../../services/patientService';
import doctorService from '../../services/doctorService';
import clinicService from '../../services/clinicService';

import { useAuth, USER_ROLES } from '../../context/AuthContext';

// Helper function to safely format dates
const safeFormatDate = (dateString, formatStr) => {
  try {
    const date = parseISO(dateString);
    return format(date, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Data inválida';
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'scheduled': return 'bg-primary';
    case 'confirmed': return 'bg-success';
    case 'completed': return 'bg-info text-dark';
    case 'cancelled': return 'bg-danger';
    default: return 'bg-secondary';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'scheduled': return 'Agendado';
    case 'confirmed': return 'Confirmado';
    case 'completed': return 'Concluído';
    case 'cancelled': return 'Cancelado';
    default: return 'Desconhecido';
  }
};

const StatusBadge = ({ status }) => {
  try {
    const statusClass = getStatusClass(status);
    const statusLabel = getStatusLabel(status);
    return <Badge className={`text-capitalize ${statusClass}`}>{statusLabel}</Badge>;
  } catch (error) {
    console.error('Error in StatusBadge:', error);
    return <Badge bg="secondary">Desconhecido</Badge>;
  }
};

export default function AppointmentsList() {
  const { userRole, userId } = useAuth(); // <- use userRole, não role
  const location = useLocation();

  // Log para diagnóstico
  console.log('[AppointmentsList] userRole:', userRole);

  const [state, setState] = useState({
    appointments: [],
    filteredAppointments: [],
    loading: true,
    error: null,
    searchTerm: '',
    statusFilter: 'all',
    dateFilter: '',
    showFilters: false,
    patients: {},
    doctors: {},
    clinics: {},
    alertMessage: null,
    alertVariant: null,
  });

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const [appointmentsData, patientsData, doctorsData, clinicsData] = await Promise.all([
        api.get('/appointments').catch(e => {
            console.error('Error fetching appointments:', e);
            return [];
        }),
        patientService.list().catch(e => {
            console.error('Error loading patients:', e);
            return [];
        }),
        doctorService.list().catch(e => {
            console.error('Error loading doctors:', e);
            return [];
        }),
        clinicService.list().catch(e => {
            console.error('Error loading clinics:', e);
            return [];
        })
      ]);

      const filteredApptsByRole = Array.isArray(appointmentsData)
        ? appointmentsData
            .filter(ap => {
              if (!ap) return false;

              let shouldInclude = false;
              if (userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.RECEPTIONIST) {
                shouldInclude = true;
              } else if (userRole === USER_ROLES.PATIENT) {
                shouldInclude = ap.patient_id === userId;
              } else if (userRole === USER_ROLES.DOCTOR) {
                shouldInclude = ap.doctor_id === userId;
              }
              return shouldInclude;
            })
            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        : [];

      const createLookup = (items) =>
        (Array.isArray(items) ? items : []).reduce((acc, item) =>
          item?.id ? { ...acc, [item.id]: item } : acc, {});

      updateState({
        appointments: filteredApptsByRole,
        filteredAppointments: filteredApptsByRole,
        patients: createLookup(patientsData),
        doctors: createLookup(doctorsData),
        clinics: createLookup(clinicsData),
        loading: false
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      updateState({
        loading: false,
        error: 'Erro ao carregar os dados. Por favor, tente novamente.'
      });
    }
  }, [userRole, userId, updateState]);

  useEffect(() => {
    if (state.loading) return;

    const { appointments, searchTerm, statusFilter, dateFilter } = state;
    let filtered = [...appointments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ap => ap.status === statusFilter);
    }

    if (dateFilter) {
      const filterDate = parseISO(dateFilter + 'T00:00:00');
      filtered = filtered.filter(ap => {
        try {
          const appointmentDate = parseISO(ap.scheduled_at);
          return (
            appointmentDate.getFullYear() === filterDate.getFullYear() &&
            appointmentDate.getMonth() === filterDate.getMonth() &&
            appointmentDate.getDate() === filterDate.getDate()
          );
        } catch (e) {
          console.error('Erro ao comparar data do agendamento:', e);
          return false;
        }
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ap => {
        const patient = state.patients[ap.patient_id] || {};
        const doctor = state.doctors[ap.doctor_id] || {};
        const clinic = state.clinics[ap.clinic_id] || {};

        return (
          (patient.first_name?.toLowerCase() || '').includes(term) ||
          (patient.last_name?.toLowerCase() || '').includes(term) ||
          (doctor.first_name?.toLowerCase() || '').includes(term) ||
          (doctor.last_name?.toLowerCase() || '').includes(term) ||
          (clinic.name?.toLowerCase() || '').includes(term) ||
          (ap.notes?.toLowerCase() || '').includes(term)
        );
      });
    }

    updateState({ filteredAppointments: filtered });
  }, [state.appointments, state.statusFilter, state.dateFilter, state.searchTerm, state.loading, state.patients, state.doctors, state.clinics, updateState]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      await api.delete(`/appointments/${id}`);
      fetchData();
      updateState({ alertMessage: 'Agendamento excluído com sucesso!', alertVariant: 'success' });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      updateState({ error: 'Erro ao excluir o agendamento. Por favor, tente novamente.', alertMessage: null });
    }
  }, [fetchData, updateState]);

  const clearFilters = useCallback(() => {
    updateState({
      searchTerm: '',
      statusFilter: 'all',
      dateFilter: '',
      showFilters: false
    });
  }, [updateState]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Data não disponível';
    return safeFormatDate(dateString, "dd/MM/yyyy 'às' HH:mm");
  }, []);

  const getPatientName = useCallback((patientId) => {
    const patient = state.patients[patientId] || {};
    return patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente sem nome' : 'Paciente não encontrado';
  }, [state.patients]);

  const getDoctorName = useCallback((doctorId) => {
    const doctor = state.doctors[doctorId] || {};
    return doctor ? `Dr(a). ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Médico sem nome' : 'Médico não encontrado';
  }, [state.doctors]);

  const getClinicName = useCallback((clinicId) => {
    const clinic = state.clinics[clinicId] || {};
    return clinic?.name || 'Clínica não especificada';
  }, [state.clinics]);

  useEffect(() => {
    fetchData();

    if (location.state?.message && location.state?.variant) {
      updateState({
        alertMessage: location.state.message,
        alertVariant: location.state.variant
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchData, location.state, updateState]);

  // --- Renderização Condicional ---

  if (state.loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
        <p className="mt-2 text-muted">Carregando agendamentos...</p>
      </Container>
    );
  }

  if (state.error) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="danger" className="text-center" style={{ maxWidth: '600px', width: '100%' }}>
          <Alert.Heading>Erro ao carregar agendamentos</Alert.Heading>
          <p>{state.error}</p>
          <div className="d-flex justify-content-center gap-2 mt-3">
            <Button onClick={fetchData} variant="outline-danger" size="sm">
              <i className="bi bi-arrow-clockwise me-1"></i> Tentar novamente
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // Validação explícita de role, mostrando alerta e NÃO redirecionando!
  if (![USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST, USER_ROLES.DOCTOR, USER_ROLES.PATIENT].includes(userRole)) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="warning" className="text-center" style={{ maxWidth: '600px', width: '100%' }}>
          <Alert.Heading>Sem permissão para acessar agendamentos</Alert.Heading>
          <p>
            Seu perfil (<b>{userRole || 'Indefinido'}</b>) não permite acessar esta área.
          </p>
        </Alert>
        <Button as={Link} to="/dashboard" variant="primary">
          Voltar para o dashboard
        </Button>
      </Container>
    );
  }

  // Card de "Nenhum agendamento encontrado"
  if (state.appointments.length === 0) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        {state.alertMessage && (
          <Alert variant={state.alertVariant} onClose={() => updateState({ alertMessage: null })} dismissible className="mb-4 w-100" style={{ maxWidth: '600px' }}>
            {state.alertMessage}
          </Alert>
        )}
        <Card className="text-center p-4 shadow-sm" style={{ maxWidth: '600px', width: '100%' }}>
          <Card.Body>
            <h4 className="text-primary mb-3">Nenhum agendamento encontrado</h4>
            <p className="text-muted mb-4">Nenhum agendamento foi cadastrado até o momento para o seu perfil.</p>
            <Button as={Link} to="/appointments/new" variant="primary">
              <Plus className="me-2" /> Novo Agendamento
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Card de "Nenhum agendamento corresponde aos filtros"
  const filtersAreActive = state.searchTerm || state.statusFilter !== 'all' || state.dateFilter;
  if (state.filteredAppointments.length === 0 && filtersAreActive) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        {state.alertMessage && (
          <Alert variant={state.alertVariant} onClose={() => updateState({ alertMessage: null })} dismissible className="mb-4 w-100" style={{ maxWidth: '600px' }}>
            {state.alertMessage}
          </Alert>
        )}
        <Card className="text-center p-4 shadow-sm" style={{ maxWidth: '600px', width: '100%' }}>
          <Card.Body>
            <h4 className="text-warning mb-3">Nenhum agendamento corresponde aos filtros</h4>
            <p className="text-muted mb-4">
              Não foram encontrados agendamentos com os critérios de busca e filtros aplicados.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <Button variant="outline-secondary" onClick={clearFilters}>
                <XCircle className="me-2" /> Limpar Filtros
              </Button>
              <Button as={Link} to="/appointments/new" variant="primary">
                <Plus className="me-2" /> Novo Agendamento
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4 pt-5">
      {state.alertMessage && (
        <Alert variant={state.alertVariant} onClose={() => updateState({ alertMessage: null })} dismissible className="mb-4">
          {state.alertMessage}
        </Alert>
      )}

      <Row className="mb-4 align-items-center pb-3 border-bottom">
        <Col md={6}>
          <h2 className="mb-0 text-primary">
            <Calendar className="me-2" />
            Agendamentos
          </h2>
        </Col>
        <Col md={6} className="text-md-end d-flex justify-content-end gap-2">
          <Button
            as={Link}
            to="/appointments/new"
            variant="primary"
          >
            <Plus className="me-1" /> Novo Agendamento
          </Button>
          <Button
            variant={state.showFilters ? 'secondary' : 'outline-secondary'}
            onClick={() => updateState({ showFilters: !state.showFilters })}
          >
            <Funnel className="me-1" />
            {state.showFilters ? 'Ocultar Filtros' : 'Filtrar'}
          </Button>
        </Col>
      </Row>

      {state.showFilters && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Row className="g-3">
              <Col md={5}>
                <Form.Group>
                  <Form.Label className="fw-bold">Buscar</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Paciente, médico, clínica ou observações..."
                      value={state.searchTerm}
                      onChange={(e) => updateState({ searchTerm: e.target.value })}
                    />
                    {state.searchTerm && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => updateState({ searchTerm: '' })}
                      >
                        <XCircle />
                      </Button>
                    )}
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold">Status</Form.Label>
                  <Form.Select
                    value={state.statusFilter}
                    onChange={(e) => updateState({ statusFilter: e.target.value })}
                  >
                    <option value="all">Todos os status</option>
                    <option value="scheduled">Agendado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold">Data</Form.Label>
                  <Form.Control
                    type="date"
                    value={state.dateFilter}
                    onChange={(e) => updateState({ dateFilter: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={1} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  onClick={clearFilters}
                  disabled={!state.searchTerm && state.statusFilter === 'all' && !state.dateFilter}
                  className="w-100"
                >
                  Limpar
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <div className="appointments-list mt-3">
        {state.filteredAppointments.map(appointment => (
          <Card key={appointment.id} className="mb-3 shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="mb-1 text-primary">
                    <Person className="me-2" />
                    {getPatientName(appointment.patient_id)}
                  </h5>
                  <p className="mb-1 text-muted">
                    <Calendar className="me-2" />
                    {formatDate(appointment.scheduled_at)}
                  </p>
                  <p className="mb-1 text-info">
                    <PersonBadgeFill className="me-2" />
                    {getDoctorName(appointment.doctor_id)}
                  </p>
                  <p className="mb-1 text-secondary">
                    <GeoAlt className="me-2" />
                    {getClinicName(appointment.clinic_id)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={appointment.status} />
                  </div>
                </div>
                <div className="d-flex flex-column gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    as={Link}
                    to={`/appointments/edit/${appointment.id}`}
                  >
                    <Pencil /> Editar
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(appointment.id)}
                  >
                    <Trash /> Remover
                  </Button>
                </div>
              </div>
              {appointment.notes && (
                <div className="mt-3 pt-2 border-top">
                  <p className="mb-0 small text-muted">
                    <strong>Observações:</strong> {appointment.notes}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>

      <div className="text-muted text-end mt-4 pt-2 border-top">
        Mostrando {state.filteredAppointments.length} de {state.appointments.length} agendamentos
      </div>
    </Container>
  );
}
