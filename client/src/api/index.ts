import axios from 'axios';
import type {
  Aquarium, WaterParameter, WaterChange, Creature, CreatureRecord,
  Feeding, Disease, Maintenance, OverviewStats, AquariumStatus, MonthlyStats,
  CareTask, TodayTasks, InventoryItem, InventoryPurchase, WaterHealthScore
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const aquariumApi = {
  getAll: () => api.get<Aquarium[]>('/aquariums').then(r => r.data),
  get: (id: number) => api.get<Aquarium>(`/aquariums/${id}`).then(r => r.data),
  create: (data: Partial<Aquarium>) => api.post<Aquarium>('/aquariums', data).then(r => r.data),
  update: (id: number, data: Partial<Aquarium>) => api.put<Aquarium>(`/aquariums/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/aquariums/${id}`).then(r => r.data),
};

export const waterParamApi = {
  getAll: (aquariumId: number, limit = 30) =>
    api.get<WaterParameter[]>(`/water-params/${aquariumId}`, { params: { limit } }).then(r => r.data),
  getLatest: (aquariumId: number) =>
    api.get<WaterParameter>(`/water-params/${aquariumId}/latest`).then(r => r.data),
  getChartData: (aquariumId: number, param: string, days = 30) =>
    api.get<{ record_date: string; value: number }[]>(`/water-params/${aquariumId}/chart`,
      { params: { param, days } }).then(r => r.data),
  create: (aquariumId: number, data: Partial<WaterParameter>) =>
    api.post<WaterParameter>(`/water-params/${aquariumId}`, data).then(r => r.data),
  update: (id: number, data: Partial<WaterParameter>) =>
    api.put<WaterParameter>(`/water-params/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/water-params/${id}`).then(r => r.data),
};

export const waterChangeApi = {
  getAll: (aquariumId: number) =>
    api.get<WaterChange[]>(`/water-changes/${aquariumId}`).then(r => r.data),
  create: (aquariumId: number, data: Partial<WaterChange>) =>
    api.post<WaterChange>(`/water-changes/${aquariumId}`, data).then(r => r.data),
  update: (id: number, data: Partial<WaterChange>) =>
    api.put<WaterChange>(`/water-changes/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/water-changes/${id}`).then(r => r.data),
};

export const creatureApi = {
  getAll: (aquariumId: number, category?: string) =>
    api.get<Creature[]>(`/creatures/${aquariumId}`, { params: { category } }).then(r => r.data),
  getSummary: (aquariumId: number) =>
    api.get<{ category: string; total_quantity: number; species_count: number }[]>(
      `/creatures/${aquariumId}/summary`).then(r => r.data),
  create: (aquariumId: number, data: Partial<Creature>) =>
    api.post<Creature>(`/creatures/${aquariumId}`, data).then(r => r.data),
  update: (id: number, data: Partial<Creature>) =>
    api.put<Creature>(`/creatures/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/creatures/${id}`).then(r => r.data),

  getRecords: (creatureId: number) =>
    api.get<CreatureRecord[]>(`/creatures/${creatureId}/records`).then(r => r.data),
  addRecord: (creatureId: number, data: Partial<CreatureRecord>) =>
    api.post<{ record: CreatureRecord; creature: Creature }>(
      `/creatures/${creatureId}/records`, data).then(r => r.data),
  deleteRecord: (recordId: number) =>
    api.delete<{ message: string; creature: Creature }>(
      `/creatures/records/${recordId}`).then(r => r.data),
};

export const feedingApi = {
  getAll: (aquariumId: number) =>
    api.get<Feeding[]>(`/feedings/${aquariumId}`).then(r => r.data),
  getFoodStats: (aquariumId: number) =>
    api.get<{ food_type: string; feed_count: number; total_amount: number }[]>(
      `/feedings/${aquariumId}/food-stats`).then(r => r.data),
  create: (aquariumId: number, data: Partial<Feeding>) =>
    api.post<Feeding>(`/feedings/${aquariumId}`, data).then(r => r.data),
  update: (id: number, data: Partial<Feeding>) =>
    api.put<Feeding>(`/feedings/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/feedings/${id}`).then(r => r.data),
};

export const diseaseApi = {
  getAll: (aquariumId: number) =>
    api.get<Disease[]>(`/diseases/${aquariumId}`).then(r => r.data),
  create: (aquariumId: number, data: Partial<Disease>) =>
    api.post<Disease>(`/diseases/${aquariumId}`, data).then(r => r.data),
  update: (id: number, data: Partial<Disease>) =>
    api.put<Disease>(`/diseases/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/diseases/${id}`).then(r => r.data),
};

export const maintenanceApi = {
  getAll: (aquariumId: number) =>
    api.get<Maintenance[]>(`/maintenances/${aquariumId}`).then(r => r.data),
  getUpcoming: (aquariumId: number) =>
    api.get<{ upcoming: Maintenance[]; overdue: Maintenance[] }>(
      `/maintenances/${aquariumId}/upcoming`).then(r => r.data),
  create: (aquariumId: number, data: Partial<Maintenance>) =>
    api.post<Maintenance>(`/maintenances/${aquariumId}`, data).then(r => r.data),
  update: (id: number, data: Partial<Maintenance>) =>
    api.put<Maintenance>(`/maintenances/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/maintenances/${id}`).then(r => r.data),
};

export const statsApi = {
  getOverview: () => api.get<OverviewStats>('/stats/overview').then(r => r.data),
  getAquariumStatus: () => api.get<AquariumStatus[]>('/stats/aquarium-status').then(r => r.data),
  getMonthlyStats: (months = 6) =>
    api.get<MonthlyStats>('/stats/monthly-stats', { params: { months } }).then(r => r.data),
  getCreatureTrends: (aquariumId?: number, months = 6) =>
    api.get<{ month: string; added: number; lost: number }[]>(
      '/stats/creature-trends', { params: { aquariumId, months } }).then(r => r.data),
  getHealthScore: (aquariumId: number) =>
    api.get<WaterHealthScore>(`/stats/health-score/${aquariumId}`).then(r => r.data),
  getHealthRanking: () =>
    api.get<WaterHealthScore[]>('/stats/health-ranking').then(r => r.data),
};

export const careTaskApi = {
  getToday: () => api.get<TodayTasks>('/care-tasks/today').then(r => r.data),
  getByAquarium: (aquariumId: number) =>
    api.get<CareTask[]>(`/care-tasks/${aquariumId}`).then(r => r.data),
  create: (aquariumId: number, data: Partial<CareTask>) =>
    api.post<CareTask>(`/care-tasks/${aquariumId}`, data).then(r => r.data),
  update: (id: number, data: Partial<CareTask>) =>
    api.put<CareTask>(`/care-tasks/${id}`, data).then(r => r.data),
  complete: (id: number, data?: Record<string, any>) =>
    api.put<CareTask>(`/care-tasks/${id}/complete`, data || {}).then(r => r.data),
  skip: (id: number) =>
    api.put<CareTask>(`/care-tasks/${id}/skip`).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/care-tasks/${id}`).then(r => r.data),
};

export const inventoryApi = {
  getAll: (params?: { aquarium_id?: number; category?: string; low_stock_only?: boolean }) =>
    api.get<InventoryItem[]>('/inventory', { params }).then(r => r.data),
  getAlerts: () => api.get<InventoryItem[]>('/inventory/alerts').then(r => r.data),
  get: (id: number) => api.get<InventoryItem>(`/inventory/${id}`).then(r => r.data),
  create: (data: Partial<InventoryItem>) =>
    api.post<InventoryItem>('/inventory', data).then(r => r.data),
  update: (id: number, data: Partial<InventoryItem>) =>
    api.put<InventoryItem>(`/inventory/${id}`, data).then(r => r.data),
  consume: (id: number, quantity: number) =>
    api.put<InventoryItem>(`/inventory/${id}/consume`, { quantity }).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/inventory/${id}`).then(r => r.data),
  getPurchases: (itemId: number) =>
    api.get<InventoryPurchase[]>(`/inventory/${itemId}/purchases`).then(r => r.data),
  addPurchase: (itemId: number, data: Partial<InventoryPurchase>) =>
    api.post<InventoryPurchase>(`/inventory/${itemId}/purchases`, data).then(r => r.data),
  deletePurchase: (purchaseId: number) =>
    api.delete(`/inventory/purchases/${purchaseId}`).then(r => r.data),
};

export default api;
