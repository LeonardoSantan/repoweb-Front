import React from 'react';
import { Container, Card } from 'react-bootstrap';
// import { useAuth } from '../../context/AuthContext'; // Se você usar AuthContext aqui

export default function Home() {
  // const { user } = useAuth(); // Exemplo de uso de contexto se houver

  return (
    // Adicionamos 'min-vh-100' e 'py-5' para centralizar no espaço disponível.
    // O 'main-content' em App.css já lida com o padding-top da Navbar.
    <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 py-5">
      <Card className="text-center p-4 shadow-sm" style={{ maxWidth: '600px', width: '100%' }}>
        <Card.Body>
          <h2 className="mb-3 text-primary">Bem-vindo ao Sistema de Gestão Médica</h2>
          <p className="lead text-muted">
            Utilize o menu acima para acessar as funcionalidades do sistema.
          </p>
          <p className="text-muted">
            Selecione uma opção no menu para começar.
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}