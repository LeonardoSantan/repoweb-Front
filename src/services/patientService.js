import api from './api';

// Função auxiliar para validar CPF
const validateCPF = (cpf) => {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[\D]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  const digit1 = remainder >= 10 ? 0 : remainder;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  const digit2 = remainder >= 10 ? 0 : remainder;
  
  // Verifica se os dígitos verificadores estão corretos
  return (parseInt(cpf.charAt(9)) === digit1 && parseInt(cpf.charAt(10)) === digit2);
};

const patientService = {
  // Lista todos os pacientes
  async list() {
    try {
      const response = await api.get('/patients');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar pacientes:', error);
      throw error;
    }
  },

  // Obtém um paciente por ID
  async getById(id) {
    try {
      const response = await api.get(`/patients/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar paciente com ID ${id}:`, error);
      throw error;
    }
  },

  // Cria um novo paciente
  async create(patientData) {
    try {
      // Validação dos campos obrigatórios
      const requiredFields = ['first_name', 'cpf', 'email', 'phone'];
      const missingFields = requiredFields.filter(field => !patientData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }
      
      // Validação do CPF
      if (patientData.cpf && !validateCPF(patientData.cpf)) {
        throw new Error('CPF inválido');
      }
      
      // Validação básica de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (patientData.email && !emailRegex.test(patientData.email)) {
        throw new Error('E-mail inválido');
      }
      
      // Formata o CPF para armazenamento (apenas números)
      const formattedData = {
        ...patientData,
        cpf: patientData.cpf.replace(/[\D]/g, '')
      };
      
      const response = await api.post('/patients', formattedData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      throw error.response?.data?.message || error.message || 'Erro ao criar paciente';
    }
  },

  // Atualiza um paciente existente
  async update(id, patientData) {
    try {
      if (!id) {
        throw new Error('ID do paciente não fornecido');
      }
      
      // Validação do CPF, se fornecido
      if (patientData.cpf && !validateCPF(patientData.cpf)) {
        throw new Error('CPF inválido');
      }
      
      // Validação básica de e-mail, se fornecido
      if (patientData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(patientData.email)) {
          throw new Error('E-mail inválido');
        }
      }
      
      // Formata o CPF para armazenamento (apenas números) se fornecido
      const formattedData = patientData.cpf ? {
        ...patientData,
        cpf: patientData.cpf.replace(/[\D]/g, '')
      } : patientData;
      
      const response = await api.put(`/patients/${id}`, formattedData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar paciente com ID ${id}:`, error);
      throw error.response?.data?.message || error.message || `Erro ao atualizar paciente com ID ${id}`;
    }
  },

  // Remove um paciente
  async delete(id) {
    try {
      await api.delete(`/patients/${id}`);
    } catch (error) {
      console.error(`Erro ao remover paciente com ID ${id}:`, error);
      throw error;
    }
  },
  
  // Pesquisa pacientes por nome ou CPF
  async search(term) {
    try {
      const response = await api.get(`/patients/search?q=${encodeURIComponent(term)}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      throw error;
    }
  },
  
  // Formata o nome completo do paciente
  formatFullName(patient) {
    if (!patient) return '';
    return `${patient.first_name} ${patient.last_name || ''}`.trim();
  },
  
  // Formata o CPF para exibição
  formatCpf(cpf) {
    if (!cpf) return '';
    // Remove qualquer formatação existente
    const cleaned = cpf.replace(/[\D]/g, '');
    // Aplica a formatação
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },
  
  // Valida um CPF
  validateCPF(cpf) {
    return validateCPF(cpf);
  }
};

export default patientService;
