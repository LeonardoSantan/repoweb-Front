import { useEffect, useState } from 'react';
import {
  Container, Table, Button, Alert, Spinner
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth, USER_ROLES } from '../../context/AuthContext';
import api from '../../services/api';

export default function ClinicsList() {
  // Proteção: use userRole do contexto
  const { userRole } = useAuth();

  // Log para diagnóstico rápido
  console.log('[ClinicsList] userRole:', userRole);

  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 pt-5">
        <Alert variant="warning" className="text-center">
          Seu perfil (<b>{userRole || 'Indefinido'}</b>) não tem permissão para acessar a área de clínicas.
        </Alert>
      </Container>
    );
  }

  /* estado */
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  /* loader */
  const fetchClinics = async () => {
    try {
      setLoading(true);
      const list = await api.get('/clinics');
      setClinics(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar clínicas.');
    } finally {
      setLoading(false);
    }
  };

  /* efeito */
  useEffect(() => {
    fetchClinics();
  }, []);

  /* remover */
  const handleDelete = async id => {
    if (!window.confirm('Deseja remover esta clínica?')) return;
    try {
      await api.delete(`/clinics/${id}`);
      fetchClinics();
    } catch (e) {
      console.error(e);
      setError('Erro ao remover clínica.');
    }
  };

  /* render */
  if (loading) return <Spinner animation="border" className="mt-4" />;

  return (
    <Container className="mt-4">
      <h2>Clínicas</h2>

      <Link to="/clinics/new">
        <Button className="mb-3">Nova Clínica</Button>
      </Link>

      {error && <Alert variant="danger">{error}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Endereço</th>
            <th>Telefone</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clinics.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.address}</td>
              <td>{c.phone}</td>
              <td>
                <Link to={`/clinics/${c.id}/edit`}>
                  <Button size="sm" variant="warning" className="me-2">
                    Editar
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(c.id)}
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
