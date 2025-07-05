// src/api.js
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuração base da API para todo o front.
const api = axios.create({
  // Use a variável de ambiente do Vite.
  // IMPORTANTE: Certifique-se de que VITE_API_BASE_URL no seu .env.development
  // esteja configurado como 'http://localhost:3000/api'
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000, // 30 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true, // Importante para enviar cookies de autenticação (se usados)
  validateStatus: status => status >= 200 && status < 400 // Aceita 2xx e 3xx como sucesso
});

// Configurações padrão que podem ser sobrescritas por requisição
const DEFAULT_CONFIG = {
  cache: false,       // Habilita/desabilita cache para GET requests
  retry: 0,           // Número de tentativas em caso de falha (não implementado no interceptor atual)
  timeout: 30000,     // Timeout em ms
  public: false,      // Se true, não requer autenticação (não adiciona token)
  showError: true,    // Se true, exibe erros automaticamente (usado em safeRequest)
  requestId: null     // ID da requisição para rastreamento
};

// Cache para requisições GET
const requestCache = new Map();
const activeRequests = new Map(); // Para controlar requisições ativas e cancelamento

// Variável para armazenar a função de callback de logout do AuthContext
let onUnauthorizedCallback = null;

/**
 * Permite que o AuthContext registre sua função de logout aqui.
 * @param {function} callback - A função logout do AuthContext.
 */
export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

/**
 * Limpa o cache de requisições
 * @param {string} [url] - URL específica para limpar (opcional)
 */
const clearCache = (url = null) => {
  if (url) {
    requestCache.delete(url);
  } else {
    requestCache.clear();
  }
};

/**
 * Cancela uma requisição ativa pelo seu ID
 * @param {string} requestId - ID da requisição a ser cancelada
 */
const cancelRequest = (requestId) => {
  const cancel = activeRequests.get(requestId);
  if (cancel) {
    cancel('Requisição cancelada pelo usuário');
    activeRequests.delete(requestId);
  }
};

// Adiciona métodos úteis à instância da API principal
api.clearCache = clearCache;
api.cancelRequest = cancelRequest;

// Método para criar uma nova instância do Axios com as mesmas configurações e interceptores
api.create = (config = {}) => {
  const instance = axios.create({
    ...api.defaults, // Copia as configurações padrão da instância 'api'
    ...config
  });

  // Reaplica interceptors da instância principal
  // Importante para que novas instâncias tenham o mesmo comportamento de autenticação/cache
  // Nota: Isso pode duplicar interceptors se a instância principal já tiver sido configurada.
  // Uma abordagem mais robusta seria ter os interceptors definidos em um módulo separado
  // e aplicá-los a todas as instâncias que precisam deles.
  api.interceptors.request.handlers.forEach(h =>
    instance.interceptors.request.use(h.fulfilled, h.rejected)
  );
  api.interceptors.response.handlers.forEach(h =>
    instance.interceptors.response.use(h.fulfilled, h.rejected)
  );

  return instance;
};

// Interceptor de requisição
api.interceptors.request.use(
  (config) => {
    // Mescla as configurações padrão com as configurações específicas da requisição
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Gera ou usa um ID de requisição para rastreamento e cancelamento
    const requestId = mergedConfig.requestId || uuidv4();
    mergedConfig.headers['X-Request-ID'] = requestId;

    // Configura o token de cancelamento para permitir o cancelamento da requisição
    const source = axios.CancelToken.source();
    mergedConfig.cancelToken = source.token;
    activeRequests.set(requestId, source.cancel); // Armazena a função de cancelamento

    // Lógica para adicionar o token de autenticação
    // Apenas adiciona o token se a requisição NÃO FOR PÚBLICA (public: false)
    if (!mergedConfig.public) {
      const token = localStorage.getItem('token');
      if (token) {
        mergedConfig.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Lógica de cache para requisições GET
    if (mergedConfig.method === 'get' && mergedConfig.cache) {
      const cacheKey = `${mergedConfig.url}:${JSON.stringify(mergedConfig.params || {})}`;
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (mergedConfig.cacheTime || 300000)) {
        // Se houver dados em cache e ainda for válido, rejeita a promessa com os dados em cache
        return Promise.reject({
          __isCached: true, // Flag para indicar que é uma resposta em cache
          data: cached.data,
          config: { ...mergedConfig, _requestId: requestId } // Mantém o _requestId
        });
      }
    }

    // Adiciona timestamp para requisições GET para evitar cache do navegador
    if (mergedConfig.method === 'get') {
      mergedConfig.params = { ...mergedConfig.params, _t: Date.now() };
    }

    // Retorna a configuração modificada da requisição, incluindo o _requestId para rastreamento
    return { ...mergedConfig, _requestId: requestId };
  },
  (error) => {
    console.error('[API] Erro no interceptor de requisição:', error);
    // Rejeita a promessa com um erro formatado
    return Promise.reject({
      message: 'Erro ao processar a requisição no frontend',
      originalError: error,
      isNetworkError: !error.response,
      config: error.config
    });
  }
);

// Interceptor de resposta
api.interceptors.response.use(
  (response) => {
    const { config, data, headers } = response;
    const requestId = config._requestId;
    if (requestId) activeRequests.delete(requestId); // Remove a requisição ativa após a conclusão

    // Lógica de cache para requisições GET bem-sucedidas
    if (config.method === 'get' && config.cache) {
      const cacheKey = `${config.url}:${JSON.stringify(config.params || {})}`;
      requestCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expires: config.cacheTime ? Date.now() + config.cacheTime : null
      });
    }

    // Verifica por um novo token no header 'x-new-token' ou no corpo da resposta (data.token)
    // E armazena no localStorage
    const newToken = headers['x-new-token'] || data.token;
    if (newToken) localStorage.setItem('token', newToken);

    return data; // Retorna apenas o 'data' da resposta, simplificando o uso no frontend
  },
  (error) => {
    // Se a promessa foi rejeitada pelo interceptor de requisição por causa do cache
    if (error.__isCached) {
      return Promise.resolve(error.data); // Resolve a promessa com os dados em cache
    }

    const errResp = {
      message: 'Erro na requisição', // Mensagem padrão de erro
      status: null,
      data: null,
      isNetworkError: false,
      isTimeout: false,
      isServerError: false,
      isUnauthorized: false,
      isForbidden: false,
      isNotFound: false,
      originalError: error // O erro original do Axios
    };

    if (error.response) {
      const { status, data } = error.response;
      errResp.status = status;
      errResp.data = data; // Dados da resposta de erro do servidor
      errResp.isServerError = status >= 500;
      errResp.isUnauthorized = status === 401;
      errResp.isForbidden = status === 403;
      errResp.isNotFound = status === 404;

      // Lógica de tratamento para 401 Unauthorized
      if (status === 401) {
        console.log("[API] Erro 401 detectado: Sessão expirada. Chamando callback de logout.");
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback(); // Chama a função logout do AuthContext
        }
        errResp.message = 'Sessão expirada. Por favor, faça login novamente.';
      } else if (status === 403) {
        errResp.message = 'Acesso não autorizado';
      } else if (status === 404) {
        errResp.message = 'Recurso não encontrado';
      } else if (status >= 500) {
        errResp.message = 'Erro interno do servidor';
      } else if (data && (data.message || data.error)) { // Pode ser 'message' ou 'error' do backend
        errResp.message = data.message || data.error;
      }

      console.error(`[API] Erro ${status} em ${error.config?.url || 'URL desconhecida'}:`, errResp.message);
    } else if (axios.isCancel(error)) { // Verifica se é um erro de cancelamento
      errResp.message = error.message; // Mensagem do cancelamento
      errResp.isCancelled = true;
      console.warn('[API] Requisição cancelada:', error.message);
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errResp.message = 'Tempo de conexão esgotado. Verifique sua conexão e tente novamente.';
      errResp.isTimeout = true;
      console.error('[API] Timeout na requisição:', error.config?.url);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta (problema de rede)
      errResp.message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      errResp.isNetworkError = true;
      console.error('[API] Sem resposta do servidor para:', error.config?.url);
    } else {
      // Outros erros na configuração da requisição
      errResp.message = 'Erro ao processar a requisição';
      console.error('[API] Erro na configuração da requisição:', error.message);
    }

    return Promise.reject(errResp); // Rejeita a promessa com o objeto de erro formatado
  }
);

// Função auxiliar para lidar com erros de forma mais limpa, exportada para uso nos componentes
export const handleApiError = (error, customMessage = null) => {
  // Se o erro já foi processado pelo interceptor de resposta, ele já estará no formato desejado
  if (error.originalError) { // Verifica se já é um erro 'customError' do interceptor
      // O interceptor já chamou o logout se for 401, então não precisamos fazer isso aqui novamente.
      return { 
          success: false, 
          message: customMessage || error.message, 
          status: error.status, 
          data: error.data,
          isNetworkError: error.isNetworkError,
          isTimeout: error.isTimeout,
          isServerError: error.isServerError,
          isUnauthorized: error.isUnauthorized,
          isForbidden: error.isForbidden,
          isNotFound: error.isNotFound,
          originalError: error.originalError
      };
  }

  // Se for um erro Axios bruto que não foi pego pelo interceptor (improvável com o setup atual)
  const errResp = {
      message: customMessage || 'Ocorreu um erro inesperado',
      status: null,
      data: null,
      isNetworkError: false,
      isTimeout: false,
      isServerError: false,
      isUnauthorized: false,
      isForbidden: false,
      isNotFound: false,
      originalError: error
  };

  if (axios.isAxiosError(error)) {
      if (error.response) {
          errResp.status = error.response.status;
          errResp.data = error.response.data;
          errResp.message = customMessage || error.response.data?.message || error.response.data?.error || error.message;
          errResp.isServerError = error.response.status >= 500;
          errResp.isUnauthorized = error.response.status === 401;
          errResp.isForbidden = error.response.status === 403;
          errResp.isNotFound = error.response.status === 404;
      } else if (error.request) {
          errResp.message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
          errResp.isNetworkError = true;
      } else {
          errResp.message = error.message;
      }
  } else {
      errResp.message = customMessage || error.message || 'Erro desconhecido';
  }

  console.error('[API] Erro na API (handleApiError):', errResp.message, errResp.originalError);

  // Não chamamos logout aqui, pois o interceptor já deve ter lidado com 401
  // e o AuthContext já está escutando mudanças no localStorage.

  return { success: false, ...errResp };
};

// Função para encapsular requisições com tratamento de erro padrão
api.safeRequest = async (requestFn, options = {}) => {
  try {
    const response = await requestFn();
    return { success: true, data: response };
  } catch (error) {
    const errorData = handleApiError(error, options.errorMessage);
    if (options.showError !== false) console.error(errorData.message);
    return { success: false, ...errorData };
  }
};

export default api;