import React, { useEffect, useState } from 'react';
import {
  Container, Table, Card, Form, Button, Alert, Spinner
} from 'react-bootstrap';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import axios from 'axios';

export default function Patients() {
  const { userRole } = useAuth(); // <-- ajuste aqui!

  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [editingId,setEditingId]= useState(null);

  const [form, setForm] = useState({
    first_name: '', last_name: '', cpf: '',
    phone: '', email: '', address: '', date_of_birth: ''
  });

  // URL absoluta do seu back-end
  const API = 'http://localhost:3000/api/patients';

  // GET /patients
  const listPatients = () =>
    axios.get(API, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
         .then(r => r.data);

  // POST /patients
  const createPatient = payload =>
    axios.post(API, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
         .then(r => r.data);

  // PUT /patients/:id
  const updatePatient = (id, payload) =>
    axios.put(`${API}/${id}`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
         .then(r => r.data);

  // DELETE /patients/:id
  const deletePatient = id =>
    axios.delete(`${API}/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  // carrega a lista
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar pacientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setEditingId(null);
    setForm({
      first_name: '', last_name: '', cpf: '',
      phone: '', email: '', address: '', date_of_birth: ''
    });
    setError(''); setSuccess('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    const payload = {
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      cpf:        form.cpf.replace(/\D/g, ''),
      phone:      form.phone.trim(),
      email:      form.email.trim(),
      address:    form.address.trim(),
      date_of_birth: form.date_of_birth
    };

    try {
      if (editingId) {
        const updated = await updatePatient(editingId, payload);
        setPatients(prev =>
          prev.map(p => (p.id === editingId ? updated : p))
        );
        setSuccess('Paciente atualizado com sucesso!');
      } else {
        const created = await createPatient(payload);
        setPatients(prev => [...prev, created]);
        setSuccess('Paciente cadastrado com sucesso!');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar paciente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = p => {
    setEditingId(p.id);
    setForm({
      first_name: p.first_name,
      last_name:  p.last_name,
      cpf:        p.cpf || '',
      phone:      p.phone,
      email:      p.email,
      address:    p.address,
      date_of_birth: p.date_of_birth
    });
    setError(''); setSuccess('');
  };

  const handleDelete = async id => {
    if (!window.confirm('Deseja remover este paciente?')) return;
    try {
      await deletePatient(id);
      setPatients(prev => prev.filter(p => p.id !== id));
      setSuccess('Paciente removido com sucesso!');
    } catch (err) {
      console.error(err);
      setError('Erro ao remover paciente.');
    }
  };

  // Log para depuração de role:
  console.log('[Patients] userRole:', userRole);

  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar a área de pacientes.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2>Pacientes</h2>

      <Card className="mb-3">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <h5>{editingId ? 'Editar paciente' : 'Novo paciente'}</h5>
            <Form.Control
              className="mb-2"
              name="first_name"
              placeholder="Primeiro Nome"
              value={form.first_name}
              onChange={handleChange}
              required
            />
            <Form.Control
              className="mb-2"
              name="last_name"
              placeholder="Sobrenome"
              value={form.last_name}
              onChange={handleChange}
              required
            />
            <Form.Control
              className="mb-2"
              name="cpf"
              placeholder="CPF (apenas números)"
              value={form.cpf}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '');
                let f = v;
                if (v.length > 3) f = `${v.slice(0,3)}.${v.slice(3)}`;
                if (v.length > 6) f = `${f.slice(0,7)}.${f.slice(7)}`;
                if (v.length > 9) f = `${f.slice(0,11)}-${f.slice(11,13)}`;
                setForm(prev => ({ ...prev, cpf: f }));
              }}
              maxLength={14}
              required
            />
            <Form.Control
              className="mb-2"
              type="tel"
              name="phone"
              placeholder="Telefone"
              value={form.phone}
              onChange={handleChange}
              required
            />
            <Form.Control
              className="mb-2"
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Form.Control
              className="mb-2"
              as="textarea"
              rows={3}
              name="address"
              placeholder="Endereço"
              value={form.address}
              onChange={handleChange}
              required
            />
            <Form.Control
              className="mb-3"
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              required
            />

            <Button type="submit" variant="primary" disabled={loading} className="me-2">
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </Form>

          {error   && <Alert variant="danger"  className="mt-3">{error}</Alert>}
          {success && <Alert variant="success" className="mt-3">{success}</Alert>}
        </Card.Body>
      </Card>

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Nome</th><th>CPF</th><th>Email</th><th>Telefone</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id}>
                <td>{p.first_name} {p.last_name}</td>
                <td>{p.cpf}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>
                  <Button size="sm" variant="warning" className="me-2" onClick={() => handleEdit(p)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>
                    Remover
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
