import React, { useEffect, useState } from 'react';
import {
  Container, Card, Form, Button, Alert, Spinner
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, USER_ROLES } from '../../context/AuthContext';
import api from '../../services/api';

export default function ClinicForm() {
  // Proteção usando userRole
  const { userRole } = useAuth();

  // Log para diagnóstico
  console.log('[ClinicForm] userRole:', userRole);

  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar o cadastro de clínicas.
        </Alert>
      </Container>
    );
  }

  /* hooks / estado */
  const { id }       = useParams();
  const editing      = Boolean(id);
  const navigate     = useNavigate();
  const [loading, setLoading] = useState(editing);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  /* carrega clínica se for edição */
  useEffect(() => {
    let active = true;
    if (editing) {
      api.get(`/clinics/${id}`)
        .then(clinic => {
          if (active) setForm({
            name:    clinic.name    ?? '',
            address: clinic.address ?? '',
            phone:   clinic.phone   ?? ''
          });
        })
        .catch(e => {
          console.error(e);
          if (active) setError('Erro ao carregar clínica.');
        })
        .finally(() => active && setLoading(false));
    } else {
      setLoading(false);
    }
    return () => { active = false; };
  }, [editing, id]);

  /* handlers */
  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editing) {
        await api.put(`/clinics/${id}`, form);
      } else {
        await api.post('/clinics', form);
      }
      navigate('/clinics', {
        state: {
          message: `Clínica ${editing ? 'atualizada' : 'cadastrada'} com sucesso!`,
          variant: 'success'
        }
      });
    } catch (e) {
      console.error('Erro ao salvar clínica:', e);
      setError(e.response?.data?.message || 'Falha ao salvar clínica.');
    } finally {
      setSaving(false);
    }
  };

  /* render */
  if (loading) return <Spinner animation="border" className="mt-4" />;

  return (
    <Container className="mt-4" style={{ maxWidth: 500 }}>
      <Card>
        <Card.Body>
          <h4>{editing ? 'Editar' : 'Nova'} Clínica</h4>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-2">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                name="name"
                value={form.name}
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
              <Form.Label>Endereço</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="address"
                value={form.address}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button
              variant="secondary"
              className="ms-2"
              onClick={() => navigate('/clinics')}
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
