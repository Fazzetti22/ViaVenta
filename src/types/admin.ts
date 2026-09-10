import { ComercioMaster, Empresa, Usuario, Zona } from './auth';

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  types: string[];
  primary_type?: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
}

export type GooglePlaceCategory = 
  | 'lawyer'
  | 'accounting'
  | 'print_shop'
  | 'hardware_store'
  | 'construction_store'
  | 'convenience_store'
  | 'grocery_or_supermarket'
  | 'pharmacy'
  | 'store';

export interface BarridoParams {
  latitud: number;
  longitud: number;
  radioMetros: number;
  categorias: GooglePlaceCategory[];
  keyword?: string;
}

export interface BarridoResultItem extends ComercioMaster {
  isNew: boolean;
  distanciaMetros?: number;
}

export interface GoogleCloudQuotaStats {
  requestsThisSession: number;
  placesDiscoveredThisSession: number;
  duplicatesPrevented: number;
  monthlyFreeCreditsUsd: number; // $200.00
  estimatedCostUsd: number; // ~$0.032 per nearby search request
  freeTierUsagePercent: number;
}

export type SectorGeografico = 'CENTRO' | 'NORTE' | 'SUR' | 'ESTE' | 'OESTE';

export interface GridZoneComputed {
  codigo_zona: string; // ej. "SUR-01", "CENTRO-01"
  sector: SectorGeografico;
  numero_secuencial: number;
  centroide_lat: number;
  centroide_lng: number;
  total_comercios: number;
  comercios: ComercioMaster[];
  radio_estimado_metros: number;
}

export interface TenantWithDetails extends Empresa {
  supervisor_email?: string;
  total_zonas?: number;
  total_vendedores?: number;
  zonas_asignadas?: string[];
}
