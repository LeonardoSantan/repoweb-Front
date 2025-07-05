import api from './api';

const doctorService = {
  // Lista todos os médicos
  async list() {
    try {
      const response = await api.get('/doctors');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar médicos:', error);
      throw error;
    }
  },

  // Obtém um médico por ID
  async getById(id) {
    try {
      const response = await api.get(`/doctors/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar médico com ID ${id}:`, error);
      throw error;
    }
  },

  // Cria um novo médico (apenas admin)
  async create(doctorData) {
    try {
      // Validação dos campos obrigatórios
      const requiredFields = ['first_name', 'last_name', 'email', 'specialty_id', 'crm'];
      const missingFields = requiredFields.filter(field => !doctorData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }
      
      // Validação básica de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (doctorData.email && !emailRegex.test(doctorData.email)) {
        throw new Error('E-mail inválido');
      }
      
      // Validação do CRM (formato: CRM/UF 123456)
      const crmRegex = /^CRM\/[A-Z]{2}\s\d{6,8}$/;
      if (doctorData.crm && !crmRegex.test(doctorData.crm)) {
        throw new Error('CRM inválido. Formato esperado: CRM/UF 123456');
      }
      
      const response = await api.post('/doctors', doctorData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar médico:', error);
      throw error.response?.data?.message || error.message || 'Erro ao criar médico';
    }
  },

  // Atualiza um médico existente (apenas admin)
  async update(id, doctorData) {
    try {
      if (!id) {
        throw new Error('ID do médico não fornecido');
      }
      
      // Validação básica de e-mail, se fornecido
      if (doctorData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(doctorData.email)) {
          throw new Error('E-mail inválido');
        }
      }
      
      // Validação do CRM, se fornecido
      if (doctorData.crm) {
        const crmRegex = /^CRM\/[A-Z]{2}\s\d{6,8}$/;
        if (!crmRegex.test(doctorData.crm)) {
          throw new Error('CRM inválido. Formato esperado: CRM/UF 123456');
        }
      }
      
      const response = await api.put(`/doctors/${id}`, doctorData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar médico com ID ${id}:`, error);
      throw error.response?.data?.message || error.message || `Erro ao atualizar médico com ID ${id}`;
    }
  },

  // Remove um médico (apenas admin)
  async delete(id) {
    try {
      await api.delete(`/doctors/${id}`);
    } catch (error) {
      console.error(`Erro ao remover médico com ID ${id}:`, error);
      throw error;
    }
  },

  // Lista médicos por clínica
  async listByClinic(clinicId) {
    try {
      if (!clinicId) {
        throw new Error('ID da clínica não fornecido');
      }
      
      const response = await api.get(`/doctors?clinic_id=${clinicId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao listar médicos da clínica ${clinicId}:`, error);
      throw error.response?.data?.message || error.message || `Erro ao listar médicos da clínica ${clinicId}`;
    }
  },

  // Lista médicos por especialidade
  async listBySpecialty(specialtyId) {
    try {
      if (!specialtyId) {
        throw new Error('ID da especialidade não fornecido');
      }
      
      const response = await api.get(`/doctors?specialty_id=${specialtyId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao listar médicos da especialidade ${specialtyId}:`, error);
      throw error.response?.data?.message || error.message || `Erro ao listar médicos da especialidade ${specialtyId}`;
    }
  },
  
  // Formata o nome completo do médico
  formatFullName(doctor) {
    if (!doctor) return '';
    return `Dr(a). ${doctor.first_name} ${doctor.last_name || ''}`.trim();
  },
  
  // Formata o CRM para exibição
  formatCrm(crm) {
    if (!crm) return '';
    // Remove formatação existente e aplica o padrão
    const cleaned = crm.replace(/[^\dA-Z]/g, '');
    if (cleaned.length < 8) return crm; // Retorna o original se não for possível formatar
    
    const uf = cleaned.substring(0, 2);
    const number = cleaned.substring(2);
    return `CRM/${uf} ${number}`;
  }
};

export default doctorService;
