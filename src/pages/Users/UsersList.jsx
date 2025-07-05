import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Table, Badge, Alert, Spinner, Container, Card, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import api from '../../services/api';

// Função auxiliar para determinar a variante do Badge da função do usuário
const getRoleBadgeVariant = (role) => {
  const variants = {
    admin: 'danger',
    doctor: 'primary',
    patient: 'success',
    receptionist: 'info',
  };
  return variants[role] || 'secondary';
};

export default function UsersList() {
  const navigate = useNavigate();

  const [state, setState] = useState({
    users: [], // Inicializado como array vazio
    loading: true,
    error: null,
  });

  // Função centralizada para atualizar o estado
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Estilo para centralizar conteúdo em tela cheia (usado para loading/error/vazio)
  const fullScreenCenteredStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - var(--navbar-height, 56px))', // Fallback para 56px se a variável não estiver definida
    flexDirection: 'column',
    gap: '1rem',
    paddingBottom: '2rem',
  };

  const fetchUsers = useCallback(async () => {
    console.log('[UsersList] Iniciando busca por usuários...');
    try {
      updateState({ loading: true, error: null });
      
      console.log('[UsersList] Fazendo requisição para /api/users...');
      // CORREÇÃO: Removido .data, pois api.get() já deve retornar o payload diretamente
      const usersData = await api.get('/users'); 
      
      console.log('[UsersList] Resposta recebida:', usersData);
      // Garantir que usersData é um array antes de atribuir
      updateState({ users: Array.isArray(usersData) ? usersData : [], loading: false });
      console.log('[UsersList] Estado atualizado com os usuários');
      
    } catch (err) {
      console.error('[UsersList] Erro ao buscar usuários:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: {
            ...err.config?.headers,
            Authorization: err.config?.headers?.Authorization ? 'Bearer [TOKEN]' : 'Não definido'
          }
        }
      });
      
      let errorMessage = 'Ocorreu um erro ao carregar os usuários. Por favor, tente novamente mais tarde.';
      if (err.response?.status === 401) {
        console.warn('[UsersList] Token inválido ou expirado. Redirecionando para login...');
        errorMessage = 'Sua sessão expirou. Por favor, faça login novamente.';
        navigate('/login', { state: { from: window.location.pathname } });
      } else if (err.response?.status === 403) {
        errorMessage = 'Você não tem permissão para acessar esta página.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Recurso não encontrado.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      }
      updateState({ error: errorMessage, loading: false });
      console.log('[UsersList] Busca de usuários finalizada');
    }
  }, [navigate, updateState]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      console.log('[UsersList] Exclusão de usuário cancelada pelo usuário');
      return;
    }
    
    console.log(`[UsersList] Iniciando exclusão do usuário ID: ${id}`);
    
    try {
      await api.delete(`/users/${id}`);
      console.log(`[UsersList] Usuário ${id} excluído com sucesso`);
      
      await fetchUsers(); // Atualiza a lista de usuários após a exclusão
      
    } catch (err) {
      console.error(`[UsersList] Erro ao excluir usuário ${id}:`, {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage = 'Ocorreu um erro ao excluir o usuário. Por favor, tente novamente mais tarde.';
      if (err.response?.status === 401) {
        errorMessage = 'Sua sessão expirou. Por favor, faça login novamente.';
        navigate('/login', { state: { from: window.location.pathname } });
      } else if (err.response?.status === 403) {
        errorMessage = 'Você não tem permissão para excluir usuários.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Usuário não encontrado.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      }
      updateState({ error: errorMessage });
    }
  }, [fetchUsers, navigate, updateState]);

  // Função para obter o Badge da função (usando a função auxiliar de variante)
  const getRoleBadge = useCallback((role) => {
    return <Badge bg={getRoleBadgeVariant(role)} className="text-capitalize">{role}</Badge>;
  }, []);

  // --- Renderização Condicional ---

  if (state.loading) {
    return (
      <Container style={fullScreenCenteredStyle}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
        <p className="mt-2 text-muted">Carregando usuários...</p>
      </Container>
    );
  }

  if (state.error) {
    return (
      <Container style={fullScreenCenteredStyle}>
        <Alert variant="danger" className="text-center" style={{ maxWidth: '600px', width: '100%' }}>
          <Alert.Heading>Erro ao carregar usuários</Alert.Heading>
          <p>{state.error}</p>
          <div className="d-flex justify-content-center gap-2 mt-3">
            <Button onClick={fetchUsers} variant="outline-danger" size="sm">
              <i className="bi bi-arrow-clockwise me-1"></i> Tentar novamente
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4 align-items-center pb-3 border-bottom">
        <Col md={6}>
          <h2 className="mb-0 text-primary">Lista de Usuários</h2>
        </Col>
        <Col md={6} className="text-md-end">
          <Button as={Link} to="/users/new" variant="primary">
            <FaPlus className="me-2" /> Novo Usuário
          </Button>
        </Col>
      </Row>

      {Array.isArray(state.users) && state.users.length > 0 ? (
        <Table striped bordered hover responsive className="shadow-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Função</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.nome}</td>
                <td>{user.email}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => navigate(`/users/edit/${user.id}`)}
                  >
                    <FaEdit />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Card className="text-center p-4 shadow-sm" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          <Card.Body>
            <h4 className="text-primary mb-3">Nenhum usuário cadastrado</h4>
            <p className="text-muted mb-4">Não há usuários registrados no sistema.</p>
            {/* Botão "Novo Usuário" removido daqui para evitar duplicação. O botão do cabeçalho é suficiente. */}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}