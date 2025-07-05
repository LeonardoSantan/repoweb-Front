import { useEffect, useState } from 'react';
import {
  Container,
  Table,
  Button,
  Alert,
  Spinner
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth, USER_ROLES } from '../../context/AuthContext';
import api from '../../services/api';

export default function DoctorsList() {
  // Proteção: use userRole
  const { userRole } = useAuth();

  // Log para depuração
  console.log('[DoctorsList] userRole:', userRole);

  // Se não for admin, mostra aviso
  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar a área de médicos.
        </Alert>
      </Container>
    );
  }

  /* ---------- estado ---------- */
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  /* ---------- loader ---------- */
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const list = await api.get('/doctors');
      setDoctors(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar médicos.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- efeito ---------- */
  useEffect(() => {
    fetchDoctors();
  }, []);

  /* ---------- remover ---------- */
  const handleDelete = async id => {
    if (!window.confirm('Deseja remover este médico?')) return;
    try {
      await api.delete(`/doctors/${id}`);
      fetchDoctors();
    } catch (e) {
      console.error(e);
      setError('Erro ao remover médico.');
    }
  };

  /* ---------- render ---------- */
  if (loading) return <Spinner animation="border" className="mt-4" />;

  return (
    <Container className="mt-4">
      <h2>Médicos</h2>

      <Link to="/doctors/new">
        <Button className="mb-3">Novo Médico</Button>
      </Link>

      {error && <Alert variant="danger">{error}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Nome</th>
            <th>CRM</th>
            <th>E-mail</th>
            <th>Telefone</th>
            <th>Clínica&nbsp;(ID)</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map(d => (
            <tr key={d.id}>
              <td>{d.first_name} {d.last_name}</td>
              <td>{d.crm}</td>
              <td>{d.email}</td>
              <td>{d.phone}</td>
              <td>{d.clinic_id}</td>
              <td>
                <Link to={`/doctors/${d.id}/edit`}>
                  <Button size="sm" variant="warning" className="me-2">
                    Editar
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(d.id)}
                >
                  Remover
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
