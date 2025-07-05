import api from './api';

const userService = {
  /**
   * Lista usuários com base nos filtros fornecidos
   * @param {Object} filters - Filtros para a busca (role, status, etc.)
   * @returns {Promise<Array>} Lista de usuários
   */
  async list(filters = {}) {
    try {
      const response = await api.get('/users', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  },

  /**
   * Busca um usuário pelo ID
   * @param {string|number} id - ID do usuário
   * @returns {Promise<Object>} Dados do usuário
   */
  async getById(id) {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar usuário com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Lista todos os médicos
   * @returns {Promise<Array>} Lista de médicos
   */
  async listDoctors() {
    return this.list({ role: 'doctor' });
  },

  /**
   * Lista todos os pacientes
   * @returns {Promise<Array>} Lista de pacientes
   */
  async listPatients() {
    return this.list({ role: 'patient' });
  },

  /**
   * Lista todos os recepcionistas
   * @returns {Promise<Array>} Lista de recepcionistas
   */
  async listReceptionists() {
    return this.list({ role: 'receptionist' });
  },

  /**
   * Atualiza os dados de um usuário
   * @param {string|number} id - ID do usuário
   * @param {Object} userData - Dados atualizados do usuário
   * @returns {Promise<Object>} Dados atualizados do usuário
   */
  async update(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar usuário com ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Remove um usuário
   * @param {string|number} id - ID do usuário
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      await api.delete(`/users/${id}`);
    } catch (error) {
      console.error(`Erro ao remover usuário com ID ${id}:`, error);
      throw error;
    }
  }
};

export default userService;
