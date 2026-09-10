export type UserRole = 'SuperAdmin' | 'Supervisor' | 'Vendedor';

export type VisitaEstado =
  | 'Venta'
  | 'Presupuestado'
  | 'Cerrado'
  | 'No atendio'
  | 'Rechazado'
  | 'Otro';

export interface Empresa {
  tenant_id: string;
  nombre_empresa: string;
  activa: boolean;
  creado_en: string;
}

export interface Usuario {
  id_usuario: string;
  tenant_id: string | null; // Nullable únicamente para SuperAdmin
  email: string;
  pin?: string | null; // Solo para Vendedor (4 dígitos)
  rol: UserRole;
  nombre_completo: string;
  creado_en: string;
  // Campos opcionales para UI/relación
  empresa?: Empresa;
}

export interface ComercioMaster {
  id_comercio: string;
  google_place_id: string;
  nombre: string;
  categoria: string;
  latitud: number;
  longitud: number;
}

export interface Zona {
  id_zona: string;
  tenant_id: string;
  nombre_zona: string;
  activa: boolean;
}

export interface Visita {
  id_visita: string;
  tenant_id: string;
  id_usuario: string;
  id_comercio: string;
  id_zona: string;
  estado_visita: VisitaEstado;
  latitud_marcado: number;
  longitud_marcado: number;
  fecha_visita: string;
}

export interface Producto {
  id_producto: string;
  tenant_id: string;
  nombre: string;
  precio: number;
  activo: boolean;
}

export interface AuthSession {
  token: string;
  usuario: Usuario;
  tenant_id: string | null;
  nombre_empresa?: string;
  issuedAt: number;
  expiresAt: number; // Timestamp en ms (issuedAt + 3 horas)
  lastActivity: number;
}

export interface LoginCredentialsPIN {
  email: string;
  pin: string; // 4 dígitos
}

export interface AuthState {
  isAuthenticated: boolean;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
}
