import { useEffect, useState } from 'react';
import { Container, Table, Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import api from '../services/api';

export default function Prontuarios() {
  const { userRole, userId } = useAuth();
  const [prontuarios, setProntuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ patientId: '', allergies: '', medications: '' });
  const [editingId, setEditingId] = useState(null);

  // Log para depuração
  console.log('[Prontuarios] userRole:', userRole, 'userId:', userId);

  // Proteção extra: paciente só pode visualizar o próprio prontuário
  const canEdit = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.DOCTOR;

  function fetchProntuarios() {
    setLoading(true);
    setError('');

    api.get('/prontuarios')
      .then(data => {
        let records = data;
        if (userRole === USER_ROLES.PATIENT) {
          // Assume que patientId no backend = userId do paciente logado
          records = records.filter(p => p.patientId === userId);
        }
        setProntuarios(records);
      })
      .catch(() => setError('Erro ao carregar prontuários.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProntuarios();
    // eslint-disable-next-line
  }, [userId, userRole]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleEdit(p) {
    setEditingId(p._id);
    setForm({
      patientId: p.patientId,
      allergies: (p.allergies || []).join(', '),
      medications: (p.medications || [])
        .map(m => `${m.name} (${m.doseMg}mg, ${m.frequency})`)
        .join('; ')
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Protege contra edição por paciente (apenas admin ou doctor)
    if (!canEdit) {
      setError('Você não tem permissão para editar prontuários.');
      return;
    }

    const allergiesArr = form.allergies.split(',')
      .map(a => a.trim())
      .filter(Boolean);
    const medicationsArr = form.medications.split(';')
      .map(m => {
        const match = m.match(/(.+)\((\d+)mg,\s*(.+)\)/);
        if (!match) return null;
        return {
          name: match[1].trim(),
          doseMg: Number(match[2]),
          frequency: match[3].trim()
        };
      })
      .filter(Boolean);

    const payload = {
      patientId: form.patientId,
      allergies: allergiesArr,
      medications: medicationsArr
    };

    try {
      if (editingId) {
        await api.put(`/prontuarios/${editingId}`, payload);
      } else {
        await api.post('/prontuarios', payload);
      }
      setForm({ patientId: '', allergies: '', medications: '' });
      setEditingId(null);
      setSuccess('Prontuário salvo com sucesso!');
      fetchProntuarios();
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      console.error('Erro ao salvar prontuário:', e);
      setError('Erro ao salvar prontuário.');
    }
  }

  // Proteção de rota: só admin, doctor ou patient podem ver
  if (![USER_ROLES.ADMIN, USER_ROLES.DOCTOR, USER_ROLES.PATIENT].includes(userRole)) {
    return (
      <Container className="py-5 d-flex flex-column justify-content-center align-items-center min-vh-100">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar a área de prontuários.
        </Alert>
      </Container>
    );
  }

  if (loading) return <Spinner animation="border" className="mt-4" />;

  return (
    <Container className="mt-4" style={{ maxWidth: 1000 }}>
      <h2>Prontuários</h2>

      {canEdit && (
        <Card className="mb-4">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <h5>{editingId ? 'Editar prontuário' : 'Novo prontuário'}</h5>
              <Form.Group className="mb-3">
                <Form.Label>ID do Paciente</Form.Label>
                <Form.Control
                  name="patientId"
                  value={form.patientId}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Alergias (separadas por vírgula)</Form.Label>
                <Form.Control
                  name="allergies"
                  value={form.allergies}
                  onChange={handleChange}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Medicações</Form.Label>
                <Form.Control
                  name="medications"
                  value={form.medications}
                  onChange={handleChange}
                  placeholder="Ex: Paracetamol (500mg, 2x/dia); Ibuprofeno (200mg, 1x/dia)"
                />
                <Form.Text className="text-muted">
                  Formato: Nome (dose, frequência) separados por ponto e vírgula
                </Form.Text>
              </Form.Group>
              <Button type="submit" variant="primary" className="me-2">
                {editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
              {editingId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ patientId: '', allergies: '', medications: '' });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </Form>
          </Card.Body>
        </Card>
      )}

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID Paciente</th>
            <th>Alergias</th>
            <th>Medicações</th>
            <th>Última atualização</th>
            {canEdit && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {(userRole === USER_ROLES.PATIENT
            ? prontuarios.filter(p => p.patientId === userId)
            : prontuarios
          ).map(p => (
            <tr key={p._id}>
              <td>{p.patientId}</td>
              <td>{(p.allergies || []).join(', ')}</td>
              <td>
                {(p.medications || [])
                  .map(m => `${m.name} (${m.doseMg}mg, ${m.frequency})`)
                  .join('; ')}
              </td>
              <td>{new Date(p.updatedAt).toLocaleString()}</td>
              {canEdit && (
                <td>
                  <Button variant="warning" size="sm" onClick={() => handleEdit(p)}>
                    Editar
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
