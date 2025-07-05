import api from './api';

const clinicService = {
  // Lista todas as clínicas
  async list() {
    try {
      const response = await api.get('/clinics');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar clínicas:', error);
      throw error;
    }
  },

  // Obtém uma clínica por ID
  async getById(id) {
    try {
      const response = await api.get(`/clinics/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar clínica com ID ${id}:`, error);
      throw error;
    }
  },

  // Cria uma nova clínica (apenas admin)
  async create(clinicData) {
    try {
      // Validação dos campos obrigatórios
      const requiredFields = ['name', 'address', 'phone', 'email'];
      const missingFields = requiredFields.filter(field => !clinicData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }
      
      // Validação básica de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (clinicData.email && !emailRegex.test(clinicData.email)) {
        throw new Error('E-mail inválido');
      }
      
      // Validação básica de telefone (aceita (00) 00000-0000 ou (00) 0000-0000)
      const phoneRegex = /^\(\d{2}\)\s\d{4,5}-?\d{4}$/;
      if (clinicData.phone && !phoneRegex.test(clinicData.phone)) {
        throw new Error('Telefone inválido. Use o formato (00) 00000-0000');
      }
      
      const response = await api.post('/clinics', clinicData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar clínica:', error);
      throw error.response?.data?.message || error.message || 'Erro ao criar clínica';
    }
  },

  // Atualiza uma clínica existente (apenas admin)
  async update(id, clinicData) {
    try {
      if (!id) {
        throw new Error('ID da clínica não fornecido');
      }
      
      // Validação básica de e-mail, se fornecido
      if (clinicData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clinicData.email)) {
          throw new Error('E-mail inválido');
        }
      }
      
      // Validação básica de telefone, se fornecido
      if (clinicData.phone) {
        const phoneRegex = /^\(\d{2}\)\s\d{4,5}-?\d{4}$/;
        if (!phoneRegex.test(clinicData.phone)) {
          throw new Error('Telefone inválido. Use o formato (00) 00000-0000');
        }
      }
      
      const response = await api.put(`/clinics/${id}`, clinicData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar clínica com ID ${id}:`, error);
      throw error.response?.data?.message || error.message || `Erro ao atualizar clínica com ID ${id}`;
    }
  },

  // Remove uma clínica (apenas admin)
  async delete(id) {
    try {
      if (!id) {
        throw new Error('ID da clínica não fornecido');
      }
      
      await api.delete(`/clinics/${id}`);
    } catch (error) {
      console.error(`Erro ao remover clínica com ID ${id}:`, error);
      throw error.response?.data?.message || error.message || `Erro ao remover clínica com ID ${id}`;
    }
  },
  
  // Formata o endereço completo da clínica
  formatAddress(clinic) {
    if (!clinic) return '';
    
    const { address, number, complement, neighborhood, city, state, zip_code } = clinic;
    const parts = [];
    
    if (address) parts.push(address);
    if (number) parts.push(number);
    if (complement) parts.push(complement);
    if (neighborhood) parts.push(neighborhood);
    
    const location = [];
    if (city) location.push(city);
    if (state) location.push(state);
    
    const addressLine = parts.join(', ');
    const locationLine = location.join(' - ');
    
    return [addressLine, locationLine, zip_code].filter(Boolean).join(' - ');
  },
  
  // Formata o telefone para exibição
  formatPhone(phone) {
    if (!phone) return '';
    
    // Remove tudo que não for dígito
    const cleaned = phone.replace(/\D/g, '');
    
    // Formata como (00) 00000-0000 ou (00) 0000-0000
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    // Retorna o original se não conseguir formatar
    return phone;
  }
};

export default clinicService;
