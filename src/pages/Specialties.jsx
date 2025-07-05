import { useEffect, useState, useCallback } from 'react';
import { Container, Table, Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import api from '../services/api';

export default function Specialties() {
  const { userRole } = useAuth(); // <-- Ajuste aqui
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);

  // Log para depuração
  console.log('[Specialties] userRole:', userRole);

  const fetchSpecialties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/specialties');
      setSpecialties(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar especialidades:', e);
      setError('Erro ao carregar especialidades.');
      setSpecialties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecialties();
  }, [fetchSpecialties]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleEdit(s) {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description || '' });
  }

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Deseja remover esta especialidade?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/specialties/${id}`);
      setSuccess('Especialidade removida com sucesso!');
      fetchSpecialties();
    } catch (e) {
      console.error('Erro ao remover especialidade:', e);
      setError('Erro ao remover especialidade. Detalhes: ' + (e.response?.data?.message || e.message));
    } finally {
      setTimeout(() => setSuccess(''), 2000);
    }
  }, [fetchSpecialties]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const dataToSend = {
      name: form.name,
      description: form.description
    };

    const method = editingId ? 'put' : 'post';
    const url = editingId
      ? `/specialties/${editingId}`
      : '/specialties';

    try {
      if (method === 'post') {
        await api.post(url, dataToSend);
      } else {
        await api.put(url, dataToSend);
      }

      setForm({ name: '', description: '' });
      setEditingId(null);
      setSuccess('Especialidade salva com sucesso!');
      fetchSpecialties();
    } catch (e) {
      console.error('Erro ao salvar especialidade:', e);
      setError('Erro ao salvar especialidade. Detalhes: ' + (e.response?.data?.message || e.message || 'Erro desconhecido.'));
    } finally {
      setTimeout(() => setSuccess(''), 2000);
    }
  }, [editingId, form, fetchSpecialties]);

  function handleCancel() {
    setEditingId(null);
    setForm({ name: '', description: '' });
  }

  if (loading) return (
    <Container className="py-5 text-center">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Carregando...</span>
      </Spinner>
      <p className="mt-2">Carregando especialidades...</p>
    </Container>
  );

  // Proteção da rota: Apenas administradores podem acessar
  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <Container className="py-5 d-flex flex-column justify-content-center align-items-center min-vh-100">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar a área de especialidades.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4" style={{ maxWidth: 800 }}>
      <h2>Especialidades Médicas</h2>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <h5>{editingId ? 'Editar especialidade' : 'Nova especialidade'}</h5>
            <Form.Group className="mb-3">
              <Form.Label>Nome da Especialidade</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Digite o nome da especialidade"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descrição da Especialidade</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Descreva a especialidade (obrigatório)"
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="me-2">
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Nome</th><th>Descrição</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {specialties.length === 0 ? (
            <tr><td colSpan={3} className="text-center">Nenhuma especialidade encontrada.</td></tr>
          ) : (
            specialties.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.description}</td>
                <td>
                  <Button variant="warning" size="sm" onClick={() => handleEdit(s)} className="me-2">Editar</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Remover</Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </Container>
  );
}
