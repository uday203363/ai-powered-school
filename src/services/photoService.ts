import { apiRequest } from './apiClient';

export const photoService = {
  async list() {
    return apiRequest('/photos');
  },
  async upload(payload: { filename: string; eventName?: string; data: string }) {
    return apiRequest('/photos', { method: 'POST', body: JSON.stringify(payload) });
  }
};

export default photoService;
