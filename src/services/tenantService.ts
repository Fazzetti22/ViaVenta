import { Empresa, Usuario } from '../types/auth';
import { TenantWithDetails } from '../types/admin';
import { supabase } from './supabaseClient';
import { gridClusteringService } from './gridClusteringService';

const STORAGE_KEY_TENANTS = 'saas_ruteo_tenants_registry_v1';
const STORAGE_KEY_SUPERVISORS = 'saas_ruteo_supervisors_registry_v1';

// Tenants iniciales para pruebas
const SEED_TENANTS: TenantWithDetails[] = [
  {
    tenant_id: 'tenant-los-andes-001',
    nombre_empresa: 'Distribuidora Los Andes S.R.L.',
    activa: true,
    creado_en: '2026-03-01T10:00:00Z',
    supervisor_email: 'supervisor@losandes.com',
    total_zonas: 6,
    total_vendedores: 4,
    zonas_asignadas: ['CENTRO-01', 'SUR-01', 'SUR-02', 'NORTE-01', 'ESTE-01', 'OESTE-01'],
  },
  {
    tenant_id: 'tenant-bebidas-norte-002',
    nombre_empresa: 'Bebidas del Norte S.A.',
    activa: true,
    creado_en: '2026-03-04T14:30:00Z',
    supervisor_email: 'supervisor@bebidasnorte.com',
    total_zonas: 4,
    total_vendedores: 2,
    zonas_asignadas: ['CENTRO-01', 'SUR-01', 'NORTE-01', 'ESTE-01'],
  },
  {
    tenant_id: 'tenant-lacteos-santiago-003',
    nombre_empresa: 'Lácteos Santiago',
    activa: false, // Empresa suspendida de muestra
    creado_en: '2026-02-15T09:15:00Z',
    supervisor_email: 'gerencia@lacteossantiago.com.ar',
    total_zonas: 0,
    total_vendedores: 1,
    zonas_asignadas: [],
  },
];

export class TenantService {
  private static instance: TenantService;

  private constructor() {
    this.ensureSeedTenants();
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  private ensureSeedTenants(): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY_TENANTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TENANTS, JSON.stringify(SEED_TENANTS));
    }
  }

  public async getTenants(): Promise<TenantWithDetails[]> {
    // Intentar leer desde Supabase
    try {
      const { data, error } = await supabase.from('empresas').select('*');
      if (!error && data && data.length > 0) {
        // Enriquecer con zonas locales si existen
        const localList = this.getLocalTenants();
        return data.map((d: any) => {
          const matched = localList.find((l) => l.tenant_id === d.tenant_id);
          return {
            tenant_id: d.tenant_id,
            nombre_empresa: d.nombre_empresa,
            activa: d.activa,
            creado_en: d.creado_en,
            supervisor_email: matched?.supervisor_email || 'supervisor@empresa.com',
            total_zonas: matched?.total_zonas || 0,
            zonas_asignadas: matched?.zonas_asignadas || [],
          };
        });
      }
    } catch {
      // noop
    }

    return this.getLocalTenants();
  }

  private getLocalTenants(): TenantWithDetails[] {
    if (typeof window === 'undefined') return SEED_TENANTS;
    const raw = localStorage.getItem(STORAGE_KEY_TENANTS);
    if (!raw) return SEED_TENANTS;
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_TENANTS;
    }
  }

  private saveLocalTenants(tenants: TenantWithDetails[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_TENANTS, JSON.stringify(tenants));
  }

  public async crearTenant(nombreEmpresa: string, emailSupervisor: string): Promise<{
    success: boolean;
    tenant?: TenantWithDetails;
    message: string;
  }> {
    const cleanNombre = nombreEmpresa.trim();
    const cleanEmail = emailSupervisor.trim().toLowerCase();

    if (!cleanNombre) {
      return { success: false, message: 'El nombre de la empresa es obligatorio.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Ingrese un correo de supervisor válido.' };
    }

    const newTenantId = `tenant-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString().slice(-4)}`;

    const newTenant: TenantWithDetails = {
      tenant_id: newTenantId,
      nombre_empresa: cleanNombre,
      activa: true,
      creado_en: new Date().toISOString(),
      supervisor_email: cleanEmail,
      total_zonas: 0,
      total_vendedores: 0,
      zonas_asignadas: [],
    };

    // 1. Guardar en Supabase empresas
    try {
      await supabase.from('empresas').insert({
        tenant_id: newTenant.tenant_id,
        nombre_empresa: newTenant.nombre_empresa,
        activa: newTenant.activa,
      });

      // 2. Crear usuario supervisor en Supabase usuarios
      await supabase.from('usuarios').insert({
        tenant_id: newTenant.tenant_id,
        email: cleanEmail,
        rol: 'Supervisor',
        nombre_completo: `Supervisor ${cleanNombre}`,
      });
    } catch {
      // noop
    }

    // 3. Guardar en LocalStorage
    const list = this.getLocalTenants();
    list.unshift(newTenant);
    this.saveLocalTenants(list);

    return {
      success: true,
      tenant: newTenant,
      message: `Empresa '${cleanNombre}' creada exitosamente con supervisor '${cleanEmail}'.`,
    };
  }

  public async toggleTenantStatus(tenantId: string): Promise<{
    success: boolean;
    nuevoEstado: boolean;
    message: string;
  }> {
    const list = this.getLocalTenants();
    const index = list.findIndex((t) => t.tenant_id === tenantId);
    if (index === -1) {
      return { success: false, nuevoEstado: false, message: 'Empresa no encontrada.' };
    }

    const current = list[index].activa;
    const nextState = !current;
    list[index].activa = nextState;
    this.saveLocalTenants(list);

    try {
      await supabase.from('empresas').update({ activa: nextState }).eq('tenant_id', tenantId);
    } catch {
      // noop
    }

    return {
      success: true,
      nuevoEstado: nextState,
      message: `Empresa '${list[index].nombre_empresa}' ahora se encuentra ${nextState ? 'ACTIVA' : 'SUSPENDIDA'}.`,
    };
  }

  public async asignarZonasGrid(tenantId: string): Promise<{
    success: boolean;
    zonasAsignadasCount: number;
    nombresZonas: string[];
    message: string;
  }> {
    const list = this.getLocalTenants();
    const index = list.findIndex((t) => t.tenant_id === tenantId);
    if (index === -1) {
      return {
        success: false,
        zonasAsignadasCount: 0,
        nombresZonas: [],
        message: 'Tenant no encontrado.',
      };
    }

    // Ejecutar clonación/asignación mediante GridClusteringService
    const result = await gridClusteringService.asignarZonasMasterATenant(tenantId);
    if (!result.success) {
      return {
        success: false,
        zonasAsignadasCount: 0,
        nombresZonas: [],
        message: result.message,
      };
    }

    const nombresZonas = result.zonas.map((z) => z.nombre_zona);
    list[index].total_zonas = nombresZonas.length;
    list[index].zonas_asignadas = nombresZonas;
    this.saveLocalTenants(list);

    return {
      success: true,
      zonasAsignadasCount: nombresZonas.length,
      nombresZonas,
      message: `Se asignaron exitosamente ${nombresZonas.length} zonas (${nombresZonas.join(', ')}) a '${list[index].nombre_empresa}'.`,
    };
  }
}

export const tenantService = TenantService.getInstance();
