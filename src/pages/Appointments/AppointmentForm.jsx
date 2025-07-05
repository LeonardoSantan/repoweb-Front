import React, { useEffect, useState } from 'react';
import {
  Container, Card, Form, Button, Spinner, Alert
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, parse } from 'date-fns';
import { useAuth, USER_ROLES } from '../../context/AuthContext';
import api from '../../services/api';

export default function AppointmentForm() {
  /* ---------- proteção de rota ---------- */
  const { userRole } = useAuth();
  // Log para debug de acesso
  console.log('[AppointmentForm] userRole:', userRole);

  const allowedRoles = [
    USER_ROLES.ADMIN,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST
  ];

  if (!allowedRoles.includes(userRole)) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar esta tela.
        </Alert>
        <Button variant="primary" href="/dashboard">
          Voltar para o dashboard
        </Button>
      </Container>
    );
  }

  /* ---------- hooks ---------- */
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const [patients, setPatients] = useState([]);
  const [doctors,  setDoctors]  = useState([]);
  const [clinics,  setClinics]  = useState([]);

  const [form, setForm] = useState({
    patient_id:  '',
    doctor_id:   '',
    clinic_id:   '',
    scheduled_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes:       '',
    status:      'scheduled'
  });

  /* ---------- carga inicial ---------- */
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const pList = await api.get('/patients');
        const dList = await api.get('/doctors');
        const cList = await api.get('/clinics');

        if (!active) return;
        setPatients(Array.isArray(pList) ? pList : []);
        setDoctors(Array.isArray(dList) ? dList : []);
        setClinics(Array.isArray(cList) ? cList : []);

        if (isEditing) {
          const appt = await api.get(`/appointments/${id}`);
          if (!active) return;
          setForm({
            patient_id:  appt.patient_id || '',
            doctor_id:   appt.doctor_id  || '',
            clinic_id:   appt.clinic_id  || '',
            scheduled_at: appt.scheduled_at
              ? format(parseISO(appt.scheduled_at), "yyyy-MM-dd'T'HH:mm")
              : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            notes:  appt.notes  || '',
            status: appt.status || 'scheduled'
          });
        }
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
        if (active) setError('Falha ao carregar dados iniciais.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isEditing, id]);

  /* ---------- handlers ---------- */
  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validação de data/hora no frontend
    const selectedDateTime = new Date(form.scheduled_at);
    const now = new Date();

    selectedDateTime.setSeconds(0, 0);
    now.setSeconds(0, 0);

    if (selectedDateTime < now) {
      setError('Data/hora não pode ser no passado. Por favor, selecione uma data e hora futura ou presente.');
      setSaving(false);
      return;
    }

    // Validação de status (apenas aceitar valores válidos)
    const validStatuses = ["scheduled", "completed", "cancelled"];
    if (!validStatuses.includes(form.status)) {
      setError("Status inválido.");
      setSaving(false);
      return;
    }

    try {
      const dataToSave = { ...form };
      dataToSave.scheduled_at = parse(
        form.scheduled_at,
        "yyyy-MM-dd'T'HH:mm",
        new Date()
      ).toISOString();

      if (isEditing) {
        await api.put(`/appointments/${id}`, dataToSave);
      } else {
        await api.post('/appointments', dataToSave);
      }
      navigate('/appointments', {
        state: {
          message: `Agendamento ${isEditing ? 'atualizado' : 'criado'} com sucesso!`,
          variant: 'success'
        }
      });
    } catch (e) {
      console.error('Erro ao salvar:', e);
      setError('Falha ao salvar agendamento. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ height: '50vh' }}
      >
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Card>
        <Card.Body>
          <h4>{isEditing ? 'Editar' : 'Novo'} Agendamento</h4>
          {error && <Alert variant="danger">{error}</Alert>}

          {patients.length === 0 && (
            <Alert variant="warning">
              Atenção: nenhum paciente retornado pela API.
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Pacientes */}
            <Form.Group className="mb-3">
              <Form.Label>Paciente</Form.Label>
              <Form.Select
                name="patient_id"
                value={form.patient_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Selecione --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Médicos */}
            <Form.Group className="mb-3">
              <Form.Label>Médico</Form.Label>
              <Form.Select
                name="doctor_id"
                value={form.doctor_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Selecione --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr(a). {d.first_name} {d.last_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Clínicas */}
            <Form.Group className="mb-3">
              <Form.Label>Clínica</Form.Label>
              <Form.Select
                name="clinic_id"
                value={form.clinic_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Selecione --</option>
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Data/hora */}
            <Form.Group className="mb-3">
              <Form.Label>Data e hora</Form.Label>
              <Form.Control
                type="datetime-local"
                name="scheduled_at"
                value={form.scheduled_at}
                onChange={handleChange}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                required
              />
            </Form.Group>

            {/* Status */}
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="scheduled">Agendado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </Form.Select>
            </Form.Group>

            {/* Observações */}
            <Form.Group className="mb-4">
              <Form.Label>Observações</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={form.notes}
                onChange={handleChange}
              />
            </Form.Group>

            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button
              variant="secondary"
              className="ms-2"
              onClick={() => navigate('/appointments')}
              disabled={saving}
            >
              Cancelar
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
