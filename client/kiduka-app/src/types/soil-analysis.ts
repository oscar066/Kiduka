// types/soil-analysis.ts

export interface AgrovetInfo {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  products: string[];
  prices: number[];
  distance_km: number;
  address?: string;
  phone?: string;
  email?: string;
  rating?: number;
  services?: string[];
}

export interface SoilInput {
  ph: number;
  n?: number;
  p?: number;
  k?: number;
  organic_carbon?: number;
  ca?: number;
  mg?: number;
  latitude: number;
  longitude: number;
}

export interface PredictionResponse {
  soil_health_index: number;
  initial_soil_fertility_status: string;
  soil_fertility_status: string;
  mentions: string[];
  recommendations: string[];
  nearest_agrovets: AgrovetInfo[];
  nutrients?: Record<string, { score: number; label: string }>;
  prediction_mode?: "FORMULA" | "ML";
  confidence?: Record<string, any>;
  prediction_id?: string;
  timestamp: string;
}

export interface PredictionHistory {
  id: string;
  user_id: string;
  soil_ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organic_carbon?: number;
  calcium?: number;
  magnesium?: number;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  soil_health_index: number;
  initial_soil_fertility_status: string;
  soil_fertility_status: string;
  mentions: string[];
  recommendations: string[];
  agrovets: AgrovetInfo[];
  simplified_texture?: string;
  created_at: string;
  updated_at: string;
}
