export interface Aquarium {
  id: number;
  name: string;
  type: string;
  size?: string | null;
  volume?: number | null;
  setup_date?: string | null;
  substrate?: string | null;
  filter_system?: string | null;
  lighting_system?: string | null;
  co2_system?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  creature_count?: number;
  param_count?: number;
  last_param_date?: string;
}

export interface WaterParameter {
  id: number;
  aquarium_id: number;
  record_date: string;
  temperature?: number | null;
  ph?: number | null;
  ammonia?: number | null;
  nitrite?: number | null;
  nitrate?: number | null;
  phosphate?: number | null;
  gh?: number | null;
  kh?: number | null;
  tds?: number | null;
  salinity?: number | null;
  calcium?: number | null;
  magnesium?: number | null;
  alkalinity?: number | null;
  notes?: string | null;
  created_at: string;
  warnings?: Warning[];
}

export interface Warning {
  parameter: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  status: 'too_low' | 'too_high';
}

export interface WaterChange {
  id: number;
  aquarium_id: number;
  change_date: string;
  volume: number;
  water_type?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Creature {
  id: number;
  aquarium_id: number;
  name: string;
  species?: string | null;
  category: string;
  quantity: number;
  add_date?: string | null;
  is_high_value: number;
  notes?: string | null;
  created_at: string;
}

export interface CreatureRecord {
  id: number;
  creature_id: number;
  record_type: string;
  record_date: string;
  quantity?: number;
  length?: number | null;
  description?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Feeding {
  id: number;
  aquarium_id: number;
  feed_date: string;
  food_type: string;
  amount?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface Disease {
  id: number;
  aquarium_id: number;
  creature_id?: number | null;
  creature_name?: string | null;
  start_date: string;
  end_date?: string | null;
  diagnosis: string;
  symptoms?: string | null;
  medication?: string | null;
  dosage?: string | null;
  result?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Maintenance {
  id: number;
  aquarium_id: number;
  maintenance_type: string;
  maintenance_date: string;
  description?: string | null;
  reminder_days?: number | null;
  next_maintenance_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface OverviewStats {
  aquariumCount: number;
  creatureStats: {
    fish_count: number;
    shrimp_count: number;
    coral_count: number;
    plant_count: number;
    total_creatures: number;
  };
  activeDiseases: number;
  upcomingMaintenances: number;
  overdueMaintenances: number;
}

export interface AquariumStatus {
  id: number;
  name: string;
  type: string;
  latestParams: WaterParameter | null;
  creatureCount: number;
  lastWaterChange: WaterChange | null;
}

export interface MonthlyStats {
  waterChanges: { month: string; count: number; total_volume: number }[];
  paramTests: { month: string; count: number }[];
  diseases: { month: string; count: number }[];
}

export const AquariumTypes = [
  { value: 'freshwater_planted', label: '淡水草缸' },
  { value: 'saltwater_reef', label: '海水珊瑚缸' },
  { value: 'freshwater_community', label: '淡水混养缸' },
  { value: 'saltwater_fish', label: '海水鱼缸' },
  { value: 'breeding', label: '繁殖缸' },
  { value: 'quarantine', label: '检疫缸' },
];

export const CreatureCategories = [
  { value: 'fish', label: '鱼类' },
  { value: 'shrimp', label: '虾蟹类' },
  { value: 'coral', label: '珊瑚' },
  { value: 'plant', label: '水草' },
  { value: 'other', label: '其他' },
];

export const RecordTypes = [
  { value: 'add', label: '入缸' },
  { value: 'death', label: '死亡' },
  { value: 'move_out', label: '移出' },
  { value: 'birth', label: '繁殖' },
  { value: 'observation', label: '观察记录' },
  { value: 'measurement', label: '体长测量' },
];

export const MaintenanceTypes = [
  { value: 'filter_change', label: '过滤棉更换' },
  { value: 'co2_refill', label: 'CO2充气' },
  { value: 'bulb_change', label: '灯管更换' },
  { value: 'pump_maintenance', label: '水泵维护' },
  { value: 'substrate_clean', label: '底床清洁' },
  { value: 'equipment_check', label: '设备检查' },
  { value: 'other', label: '其他' },
];
