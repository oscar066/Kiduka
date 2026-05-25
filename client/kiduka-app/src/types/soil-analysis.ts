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
  location_name?: string;
}

export interface NutrientScore {
  score: number;
  label: string;
  method?: "measured" | "estimated";
  continuous_score?: number | null;
}

export interface PredictionConfidence {
  confidence_level?: string;
  flag_poor_result?: boolean;
  model_fc_accuracy?: string;
  model_within_one?: string;
  nutrients?: Array<{
    nutrient: string;
    score?: number;
    label?: string;
    within_one_accuracy: string;
    r2: number;
    flag_low: boolean;
  }>;
}

export interface PredictionResponse {
  soil_health_index: number;
  initial_soil_fertility_status: string;
  soil_fertility_status: string;
  mentions: string[];
  recommendations: string[];
  nearest_agrovets: AgrovetInfo[];
  nutrients?: Record<string, NutrientScore>;
  prediction_mode?: "FORMULA" | "ML";
  confidence?: PredictionConfidence;
  prediction_id?: string;
  location_name?: string;
  timestamp: string;
}

export interface PredictionHistory {
  id: string;
  user_id: string;
  soil_ph?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  organic_carbon?: number | null;
  calcium?: number | null;
  magnesium?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_name?: string;
  soil_health_index: number;
  initial_soil_fertility_status: string;
  soil_fertility_status: string;
  mentions: string[];
  recommendations: string[];
  agrovets: AgrovetInfo[];
  nutrients?: Record<string, NutrientScore>;
  prediction_mode?: "FORMULA" | "ML";
  simplified_texture?: string;
  created_at: string;
  updated_at: string;
}
