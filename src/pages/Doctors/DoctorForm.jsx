import React, { useEffect, useState } from 'react';
import {
  Container, Card, Form, Button, Alert, Spinner
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, USER_ROLES } from '../../context/AuthContext';
import api from '../../services/api';

export default function DoctorForm() {
  const { userRole } = useAuth(); // ajuste aqui!

  // Log para depuração
  console.log('[DoctorForm] userRole:', userRole);

  // Permissão apenas para admin
  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar o cadastro de médicos.
        </Alert>
      </Container>
    );
  }

  const { id }         = useParams();
  const isEditing      = Boolean(id);
  const navigate       = useNavigate();

  const [loading, setLoading]   = useState(isEditing);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');

  const [clinics, setClinics]   = useState([]);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    email: '', crm: '', clinic_id: ''
  });

  /* ---------- carrega clínicas (e médico se editar) ---------- */
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const list = await api.get('/clinics');
        if (active) setClinics(Array.isArray(list) ? list : []);

        if (isEditing) {
          const doc = await api.get(`/doctors/${id}`);
          if (active) {
            setForm({
              first_name: doc.first_name ?? '',
              last_name:  doc.last_name  ?? '',
              phone:      doc.phone      ?? '',
              email:      doc.email      ?? '',
              crm:        doc.crm        ?? '',
              clinic_id:  doc.clinic_id  ?? ''
            });
          }
        }
      } catch (e) {
        console.error(e);
        if (active) setError('Erro ao carregar dados.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [isEditing, id]);

  /* ---------- handlers ---------- */
  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);

    if (!form.clinic_id) {
      setError('Selecione a clínica do médico.');
      setSaving(false);
      return;
    }

    const payload = { ...form };

    try {
      if (isEditing) {
        await api.put(`/doctors/${id}`, payload);
      } else {
        await api.post('/doctors', payload);
      }
      navigate('/doctors', {
        state: {
          message: `Médico ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`,
          variant: 'success'
        }
      });
    } catch (e) {
      console.error(e);
      setError('Falha ao salvar médico.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- render ---------- */
  if (loading) return <Spinner animation="border" className="mt-4" />;

  return (
    <Container className="mt-4" style={{ maxWidth: 600 }}>
      <Card>
        <Card.Body>
          <h4>{isEditing ? 'Editar' : 'Novo'} Médico</h4>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-2">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Sobrenome</Form.Label>
              <Form.Control
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>CRM</Form.Label>
              <Form.Control
                name="crm"
                value={form.crm}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Telefone</Form.Label>
              <Form.Control
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </Form.Group>

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

            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button
              variant="secondary"
              className="ms-2"
              onClick={() => navigate('/doctors')}
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
