import api from './api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const appointmentService = {
  // Lista todos os agendamentos
  async list(filters = {}) {
    try {
      // Constrói a query string a partir dos filtros
      const queryParams = new URLSearchParams();
      
      // Adiciona os filtros à query string se estiverem definidos
      if (filters.patientId) queryParams.append('patient_id', filters.patientId);
      if (filters.doctorId) queryParams.append('doctor_id', filters.doctorId);
      if (filters.clinicId) queryParams.append('clinic_id', filters.clinicId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('start_date', filters.startDate);
      if (filters.endDate) queryParams.append('end_date', filters.endDate);
      
      const queryString = queryParams.toString();
      const url = `/appointments${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      throw error;
    }
  },

  // Obtém um agendamento por ID
  async getById(id) {
    try {
      const response = await api.get(`/appointments/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar agendamento com ID ${id}:`, error);
      throw error;
    }
  },

  // Cria um novo agendamento
  async create(appointmentData) {
    try {
      // Validação dos campos obrigatórios
      const requiredFields = ['patient_id', 'doctor_id', 'clinic_id', 'scheduled_at'];
      const missingFields = requiredFields.filter(field => !appointmentData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }
      
      // Validação da data
      const scheduledAt = new Date(appointmentData.scheduled_at);
      if (isNaN(scheduledAt.getTime())) {
        throw new Error('Data/hora do agendamento inválida');
      }
      
      // Formata a data para o formato esperado pelo backend
      const formattedData = {
        ...appointmentData,
        scheduled_at: format(scheduledAt, "yyyy-MM-dd'T'HH:mm:ss")
      };
      
      const response = await api.post('/appointments', formattedData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      throw error.response?.data?.message || error.message || 'Erro ao criar agendamento';
    }
  },

  // Atualiza um agendamento existente
  async update(id, appointmentData) {
    try {
      if (!id) {
        throw new Error('ID do agendamento não fornecido');
      }
      
      // Validação da data, se fornecida
      if (appointmentData.scheduled_at) {
        const scheduledAt = new Date(appointmentData.scheduled_at);
        if (isNaN(scheduledAt.getTime())) {
          throw new Error('Data/hora do agendamento inválida');
        }
        // Atualiza o valor formatado
        appointmentData.scheduled_at = format(scheduledAt, "yyyy-MM-dd'T'HH:mm:ss");
      }
      
      const response = await api.put(`/appointments/${id}`, appointmentData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar agendamento com ID ${id}:`, error);
      throw error.response?.data?.message || error.message || `Erro ao atualizar agendamento com ID ${id}`;
    }
  },

  // Remove um agendamento
  async delete(id) {
    try {
      await api.delete(`/appointments/${id}`);
    } catch (error) {
      console.error(`Erro ao remover agendamento com ID ${id}:`, error);
      throw error;
    }
  },

  // Formata a data para exibição
  formatDate(dateString, formatString = 'dd/MM/yyyy HH:mm') {
    if (!dateString) return 'Não agendado';
    return format(parseISO(dateString), formatString, { locale: ptBR });
  },

  // Obtém o status formatado
  getStatusLabel(status) {
    const statusMap = {
      scheduled: 'Agendado',
      confirmed: 'Confirmado',
      canceled: 'Cancelado',
      completed: 'Concluído',
      no_show: 'Não compareceu'
    };
    
    return statusMap[status] || status;
  },
  
  // Obtém a classe CSS para o status
  getStatusClass(status) {
    const statusClasses = {
      scheduled: 'bg-warning text-dark',
      confirmed: 'bg-info text-white',
      canceled: 'bg-danger text-white',
      completed: 'bg-success text-white',
      no_show: 'bg-secondary text-white'
    };
    
    return statusClasses[status] || 'bg-secondary text-white';
  }
};

export default appointmentService;
