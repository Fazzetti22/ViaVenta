import { Empresa, Usuario } from '../types/auth';
import { TenantWithDetails } from '../types/admin';
import { supabase } from './supabaseClient';
import { gridClusteringService } from './gridClusteringService';
import { supervisorService } from './supervisorService';

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
      const { data: empresasData, error: empError } = await supabase.from('empresas').select('*');
      if (!empError && empresasData && empresasData.length > 0) {
        // Traer usuarios supervisores para vincularlos con su empresa
        const { data: usuariosData } = await supabase
          .from('usuarios')
          .select('id_usuario, tenant_id, email, nombre_completo, pin, rol')
          .eq('rol', 'Supervisor');

        const localList = this.getLocalTenants();

        return empresasData.map((d: any) => {
          const tenantId = d.id || d.tenant_id;
          const supervisor = usuariosData?.find((u: any) => u.tenant_id === tenantId);
          const matchedLocal = localList.find((l) => l.tenant_id === tenantId || l.nombre_empresa === d.nombre_empresa);

          return {
            tenant_id: tenantId,
            nombre_empresa: d.nombre_empresa,
            activa: d.activa ?? true,
            creado_en: d.creado_en || new Date().toISOString(),
            supervisor_email: supervisor?.email || d.email_contacto || matchedLocal?.supervisor_email || 'supervisor@empresa.com',
            supervisor_password: supervisor?.pin || matchedLocal?.supervisor_password || 'admin123',
            total_zonas: matchedLocal?.total_zonas || 0,
            total_vendedores: matchedLocal?.total_vendedores || 0,
            zonas_asignadas: matchedLocal?.zonas_asignadas || [],
          };
        });
      }
    } catch (err) {
      console.warn('Fallo consulta Supabase empresas, usando cache local:', err);
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

  public async crearTenant(
    nombreEmpresa: string,
    emailSupervisor: string,
    passwordSupervisor?: string
  ): Promise<{
    success: boolean;
    tenant?: TenantWithDetails;
    message: string;
  }> {
    const cleanNombre = nombreEmpresa.trim();
    const cleanEmail = emailSupervisor.trim().toLowerCase();
    const cleanPassword = passwordSupervisor?.trim() || 'admin123';

    if (!cleanNombre) {
      return { success: false, message: 'El nombre de la empresa es obligatorio.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Ingrese un correo de supervisor válido.' };
    }

    let tenantUuid = '';

    // 1. Guardar en Supabase empresas (columna id es UUID generado por PostgreSQL)
    try {
      const { data: empData, error: empError } = await supabase
        .from('empresas')
        .insert({
          nombre_empresa: cleanNombre,
          email_contacto: cleanEmail,
          activa: true,
        })
        .select()
        .single();

      if (empError) {
        console.error('Error insertando en empresas Supabase:', empError);
      } else if (empData) {
        tenantUuid = empData.id;
      }
    } catch (err) {
      console.error('Excepción al crear empresa en Supabase:', err);
    }

    // Fallback de UUID si offline
    if (!tenantUuid) {
      tenantUuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : '22222222-3333-4444-8555-' + Date.now().toString().slice(-12);
    }

    // 2. Crear usuario supervisor en Supabase tabla usuarios
    try {
      const { data: usrData, error: usrError } = await supabase
        .from('usuarios')
        .insert({
          tenant_id: tenantUuid,
          email: cleanEmail,
          rol: 'Supervisor',
          nombre_completo: `Supervisor ${cleanNombre}`,
          pin: cleanPassword,
          activo: true,
        })
        .select()
        .single();

      if (usrError) {
        console.error('Error creando usuario supervisor en Supabase:', usrError);
      }
    } catch (err) {
      console.error('Excepción al crear supervisor en Supabase:', err);
    }

    const newTenant: TenantWithDetails = {
      tenant_id: tenantUuid,
      nombre_empresa: cleanNombre,
      activa: true,
      creado_en: new Date().toISOString(),
      supervisor_email: cleanEmail,
      supervisor_password: cleanPassword,
      total_zonas: 0,
      total_vendedores: 0,
      zonas_asignadas: [],
    };

    // 3. Guardar en LocalStorage para disponibilidad inmediata y soporte offline
    const list = this.getLocalTenants();
    list.unshift(newTenant);
    this.saveLocalTenants(list);

    return {
      success: true,
      tenant: newTenant,
      message: `Empresa "${cleanNombre}" dada de alta exitosamente. Supervisor "${cleanEmail}" habilitado (Clave: ${cleanPassword}).`,
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
      // Soportar tanto columna 'id' como 'tenant_id'
      await supabase.from('empresas').update({ activa: nextState }).eq('id', tenantId);
    } catch {
      // noop
    }

    return {
      success: true,
      nuevoEstado: nextState,
      message: `Empresa '${list[index].nombre_empresa}' ahora se encuentra ${nextState ? 'ACTIVA' : 'SUSPENDIDA'}.`,
    };
  }

  public async asignarZonasGrid(
    tenantId: string,
    codigosZonas?: string[]
  ): Promise<{
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
        message: 'Distribuidora no encontrada.',
      };
    }

    // Ejecutar clonación/asignación mediante GridClusteringService
    const result = await gridClusteringService.asignarZonasMasterATenant(
      tenantId,
      undefined,
      codigosZonas
    );
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

    // Sincronizar de forma inmediata con el panel del supervisor del tenant
    try {
      await supervisorService.sincronizarZonasTenant(
        tenantId,
        result.zonas.map((z) => ({
          codigo_zona: z.nombre_zona,
          nombre_comercial: `Zona ${z.nombre_zona}`,
        }))
      );
    } catch (e) {
      console.warn('Advertencia sincronizando con supervisorService:', e);
    }

    return {
      success: true,
      zonasAsignadasCount: nombresZonas.length,
      nombresZonas,
      message: `Se asignaron exitosamente ${nombresZonas.length} zonas (${nombresZonas.join(', ')}) a '${list[index].nombre_empresa}'.`,
    };
  }
}

export const tenantService = TenantService.getInstance();
