import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Form, Button, Card, Container, Alert, Spinner, Row, Col } from 'react-bootstrap';
import api from '../../services/api';

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [state, setState] = useState({
    formData: {
      nome: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: 'patient'
    },
    loading: false, // Indica se está carregando os dados do usuário (em edição)
    submitting: false, // Indica se o formulário está sendo submetido
    error: null, // Mudar de string vazia para null
  });

  // Função centralizada para atualizar o estado
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Função para atualizar apenas o formData dentro do state
  const updateFormData = useCallback((updates) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...updates
      }
    }));
  }, []);

  // Define a altura mínima para centralização, considerando a Navbar
  const fullScreenCenteredStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - var(--navbar-height, 56px))', // Fallback para 56px
    flexDirection: 'column',
    gap: '1rem',
    paddingBottom: '2rem',
  };

  const fetchUser = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      // CORREÇÃO AQUI: Esperamos que api.get retorne os dados do usuário diretamente
      const userData = await api.get(`/users/${id}`); 
      // Agora, userData já é o objeto com nome, email, role etc.
      const { nome, email, role } = userData; // Removido o .data
      updateFormData({
        nome,
        email,
        role,
        password: '', // Limpar senhas ao carregar para edição
        password_confirmation: ''
      });
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
      let errorMessage = 'Erro ao carregar usuário. Verifique sua conexão e tente novamente.';
      if (err.response?.status === 401) {
        navigate('/login', { state: { from: window.location.pathname } });
        errorMessage = 'Sessão expirada. Redirecionando para login.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Usuário não encontrado.';
        navigate('/users'); // Redireciona para a lista se não encontrar
      }
      updateState({ error: errorMessage });
    } finally {
      updateState({ loading: false });
    }
  }, [id, navigate, updateState, updateFormData]);

  useEffect(() => {
    if (isEditing) {
      fetchUser();
    }
  }, [isEditing, fetchUser]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  }, [updateFormData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validação
    if (!state.formData.nome || !state.formData.email) {
      updateState({ error: 'Nome e e-mail são obrigatórios' });
      return;
    }
    
    // Para um novo usuário, a senha é obrigatória
    if (!isEditing && !state.formData.password) {
      updateState({ error: 'A senha é obrigatória' });
      return;
    }
    
    // Se a senha foi digitada (nova ou editada), confirmar correspondência
    if (state.formData.password && state.formData.password !== state.formData.password_confirmation) {
      updateState({ error: 'As senhas não conferem' });
      return;
    }
    
    try {
      updateState({ submitting: true, error: null });
      
      const userData = { 
        nome: state.formData.nome,
        email: state.formData.email,
        role: state.formData.role
      };
      
      // Só inclui a senha se estiver sendo alterada/criada E tiver sido preenchida
      if (state.formData.password) {
        userData.password = state.formData.password;
      }
      
      if (isEditing) {
        await api.put(`/users/${id}`, userData);
      } else {
        await api.post('/users', userData);
      }
      
      navigate('/users');
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      
      let errorMessage = 'Erro ao salvar usuário. Verifique sua conexão e tente novamente.';
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Dados inválidos. Verifique os campos e tente novamente.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
        navigate('/login', { state: { from: window.location.pathname } });
      } else if (err.response?.status === 409) {
        errorMessage = 'Este e-mail já está em uso. Por favor, utilize outro e-mail.';
      }
      updateState({ error: errorMessage });
    } finally {
      updateState({ submitting: false });
    }
  }, [isEditing, id, navigate, state.formData, updateState]);

  // --- Renderização Condicional ---

  if (state.loading) {
    return (
      <Container style={fullScreenCenteredStyle}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
        <p className="mt-2 text-muted">Carregando dados do usuário...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4 align-items-center pb-3 border-bottom">
        <Col md={12}>
          <h2 className="mb-0 text-primary">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
        </Col>
      </Row>
      
      <Card className="shadow-sm" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Card.Body>
          {state.error && <Alert variant="danger">{state.error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Nome *</Form.Label>
              <Form.Control 
                type="text" 
                name="nome"
                value={state.formData.nome}
                onChange={handleChange}
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>E-mail *</Form.Label>
              <Form.Control 
                type="email" 
                name="email"
                value={state.formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Função *</Form.Label>
              <Form.Select 
                name="role"
                value={state.formData.role}
                onChange={handleChange}
                required
              >
                <option value="admin">Administrador</option>
                <option value="doctor">Médico</option>
                <option value="patient">Paciente</option>
                <option value="receptionist">Recepcionista</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{isEditing ? 'Nova Senha' : 'Senha *'}</Form.Label>
              <Form.Control 
                type="password" 
                name="password"
                value={state.formData.password}
                onChange={handleChange}
                placeholder={isEditing ? 'Deixe em branco para manter a senha atual' : ''}
                required={!isEditing}
              />
            </Form.Group>

            {state.formData.password && (
              <Form.Group className="mb-4">
                <Form.Label>Confirmar {isEditing ? 'Nova ' : ''}Senha *</Form.Label>
                <Form.Control 
                  type="password" 
                  name="password_confirmation"
                  value={state.formData.password_confirmation}
                  onChange={handleChange}
                  required={!!state.formData.password}
                />
              </Form.Group>
            )}

            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => navigate('/users')}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={state.submitting}>
                {state.submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}