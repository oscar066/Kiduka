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

export interface Recommendation {
  category: string;
  priority: string;
  action: string;
  reasoning: string;
  timeframe: string;
}

export interface StructuredResponse {
  explanation: {
    summary: string;
    fertility_analysis: string;
    nutrient_analysis: string;
    ph_analysis: string;
    soil_texture_analysis: string;
    overall_assessment: string;
  };
  recommendations: Recommendation[];
  fertilizer_justification: string;
  confidence_assessment: string;
  long_term_strategy: string;
}

export interface SoilData {
  simplified_texture?: string;
  soil_ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organic_matter?: number;
  calcium?: number;
  magnesium?: number;
  copper?: number;
  iron?: number;
  zinc?: number;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  fertility_prediction: string;
  fertility_confidence?: number;
  fertilizer_recommendation: string;
  fertilizer_confidence?: number;
  structured_response?: StructuredResponse;
  agrovets?: AgrovetInfo[];
  created_at?: string;
  updated_at?: string;
}

export interface SoilInput {
  simplified_texture: string;
  ph: number;
  n: number;
  p: number;
  k: number;
  o: number;
  ca: number;
  mg: number;
  cu: number;
  fe: number;
  zn: number;
  latitude: number;
  longitude: number;
}

export interface SoilOutput {
  soil_fertility_status: string;
  soil_fertility_confidence: number;
  fertilizer_recommendation: string;
  fertilizer_confidence: number;
  explanation?: string;
  recommendations?: string[];
  structured_response?: StructuredResponse;
  timestamp: string;
  nearest_agrovets: any[];
}
