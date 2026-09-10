/**
 * SERVICIO DE GESTIÓN DEL SUPERVISOR (Módulo 4)
 * Administración de Zonas, ABM Vendedores con PIN, ABM Catálogo de Productos,
 * Telemetría GPS en Vivo de Vendedores, Auditoría de Tickets y Exportación a CSV.
 */

import { supabase } from './supabaseClient';
import { offlineStore, DEFAULT_CATALOGO } from './offlineStore';

export interface VendedorAuditoria {
  id_usuario: string;
  tenant_id: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  pin: string;
  activo: boolean;
  zona_asignada: string;
  jornada_iniciada: boolean;
  ultima_conexion: string;
  gps_lat: number;
  gps_lng: number;
}

export interface ZonaSupervision {
  id_zona: string;
  tenant_id: string;
  codigo_zona: string; // ej: 'SUR-01'
  nombre_comercial: string; // ej: 'Barrio Belgrano Sur - Ruta A'
  vendedor_id?: string;
  vendedor_nombre?: string;
  total_comercios: number;
  comercios_ids: string[];
  activa: boolean;
}

export interface ProductoTenant {
  id_producto: string;
  tenant_id: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  activo: boolean;
}

export interface VisitaAuditoria {
  id_visita: string;
  tenant_id: string;
  vendedor_id: string;
  vendedor_nombre: string;
  comercio_id: string;
  comercio_nombre: string;
  direccion: string;
  zona: string;
  estado: 'Venta' | 'Presupuestado' | 'No atendio' | 'Rechazado' | 'Cerrado';
  motivo_rechazo?: string;
  hora_visita: string;
  fecha: string;
  latitud: number;
  longitud: number;
  monto_total: number;
  forma_pago?: 'Efectivo' | 'Transferencia' | 'Crédito / A cuenta';
  items?: {
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
  observaciones?: string;
}

export interface CoberturaClienteItem {
  id_comercio: string;
  nombre: string;
  direccion: string;
  zona: string;
  categoria: string;
  total_visitas: number;
  ventas_concretadas: number;
  efectividad_pct: number;
  ultima_visita: string;
  ultimo_estado: string;
}

const STORAGE_KEY_VENDEDORES = 'saas_supervisor_vendedores_v1';
const STORAGE_KEY_ZONAS = 'saas_supervisor_zonas_v1';
const STORAGE_KEY_PRODUCTOS = 'saas_supervisor_productos_v1';
const STORAGE_KEY_VISITAS = 'saas_supervisor_visitas_v1';

// Vendedores de muestra iniciales vinculados a Santiago del Estero
const SEED_VENDEDORES: VendedorAuditoria[] = [
  {
    id_usuario: 'vend-001',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    nombre_completo: 'Juan Pérez',
    email: 'vendedor@losandes.com',
    telefono: '+54 9 385 512-3456',
    pin: '1234',
    activo: true,
    zona_asignada: 'SUR-01',
    jornada_iniciada: true,
    ultima_conexion: 'Hace 4 min',
    gps_lat: -27.8040,
    gps_lng: -64.2595,
  },
  {
    id_usuario: 'vend-002',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    nombre_completo: 'Mariano Gómez',
    email: 'mgomez@losandes.com',
    telefono: '+54 9 385 498-7654',
    pin: '5678',
    activo: true,
    zona_asignada: 'CENTRO-01',
    jornada_iniciada: true,
    ultima_conexion: 'Hace 12 min',
    gps_lat: -27.7890,
    gps_lng: -64.2625,
  },
  {
    id_usuario: 'vend-003',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    nombre_completo: 'Luciana Herrera',
    email: 'lherrera@losandes.com',
    telefono: '+54 9 385 611-2233',
    pin: '4321',
    activo: true,
    zona_asignada: 'NORTE-01',
    jornada_iniciada: false,
    ultima_conexion: 'Hoy 08:30',
    gps_lat: -27.7780,
    gps_lng: -64.2670,
  },
];

// Zonas de muestra con nombres comerciales editables
const SEED_ZONAS: ZonaSupervision[] = [
  {
    id_zona: 'zona-sur-01',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    codigo_zona: 'SUR-01',
    nombre_comercial: 'Barrio Belgrano Sur - Ruta A',
    vendedor_id: 'vend-001',
    vendedor_nombre: 'Juan Pérez',
    total_comercios: 24,
    comercios_ids: ['com-sur-01', 'com-sur-02', 'com-sur-03', 'com-sur-04', 'com-sur-05', 'com-sur-06'],
    activa: true,
  },
  {
    id_zona: 'zona-sur-02',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    codigo_zona: 'SUR-02',
    nombre_comercial: 'Av. Solís y Alrededores - Ruta B',
    vendedor_id: undefined,
    vendedor_nombre: undefined,
    total_comercios: 19,
    comercios_ids: [],
    activa: true,
  },
  {
    id_zona: 'zona-centro-01',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    codigo_zona: 'CENTRO-01',
    nombre_comercial: 'Casco Céntrico Peatonal & Plaza Libertad',
    vendedor_id: 'vend-002',
    vendedor_nombre: 'Mariano Gómez',
    total_comercios: 28,
    comercios_ids: [],
    activa: true,
  },
  {
    id_zona: 'zona-norte-01',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    codigo_zona: 'NORTE-01',
    nombre_comercial: 'Parque Aguirre & Costanera',
    vendedor_id: 'vend-003',
    vendedor_nombre: 'Luciana Herrera',
    total_comercios: 16,
    comercios_ids: [],
    activa: true,
  },
  {
    id_zona: 'zona-este-01',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    codigo_zona: 'ESTE-01',
    nombre_comercial: 'Acceso Puente Carretero - La Banda',
    vendedor_id: undefined,
    vendedor_nombre: undefined,
    total_comercios: 21,
    comercios_ids: [],
    activa: true,
  },
];

// Semilla de visitas para la jornada actual (Santiago del Estero)
const SEED_VISITAS: VisitaAuditoria[] = [
  {
    id_visita: 'vis-101',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    vendedor_id: 'vend-001',
    vendedor_nombre: 'Juan Pérez',
    comercio_id: 'com-sur-01',
    comercio_nombre: 'Despensa & Kiosco La Esquina',
    direccion: 'Av. Belgrano Sur 1420',
    zona: 'SUR-01',
    estado: 'Venta',
    hora_visita: '09:45 hs',
    fecha: new Date().toISOString().split('T')[0],
    latitud: -27.8010,
    longitud: -64.2580,
    monto_total: 18450,
    forma_pago: 'Efectivo',
    items: [
      { nombre: 'Coca Cola Sabor Original 2.25L', cantidad: 3, precio_unitario: 2650, subtotal: 7950 },
      { nombre: 'Galletitas Chocolinas Bagley 250g', cantidad: 5, precio_unitario: 1350, subtotal: 6750 },
      { nombre: 'Aceite de Girasol Natura 1.5L', cantidad: 2, precio_unitario: 1875, subtotal: 3750 },
    ],
    observaciones: 'Entregar por la mañana antes de las 13 hs',
  },
  {
    id_visita: 'vis-102',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    vendedor_id: 'vend-001',
    vendedor_nombre: 'Juan Pérez',
    comercio_id: 'com-sur-02',
    comercio_nombre: 'Minimercado Don Antonio',
    direccion: 'Calle Alsina 680',
    zona: 'SUR-01',
    estado: 'Venta',
    hora_visita: '10:30 hs',
    fecha: new Date().toISOString().split('T')[0],
    latitud: -27.8045,
    longitud: -64.2605,
    monto_total: 32600,
    forma_pago: 'Transferencia',
    items: [
      { nombre: 'Yerba Mate Playadito Especial 1Kg', cantidad: 4, precio_unitario: 3950, subtotal: 15800 },
      { nombre: 'Cerveza Quilmes Clásica 1L Retornable', cantidad: 6, precio_unitario: 1980, subtotal: 11880 },
      { nombre: 'Alfajor Havanna Mixto (Caja x6)', cantidad: 1, precio_unitario: 4920, subtotal: 4920 },
    ],
    observaciones: 'Cliente habitual, solicitó factura A',
  },
  {
    id_visita: 'vis-103',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    vendedor_id: 'vend-001',
    vendedor_nombre: 'Juan Pérez',
    comercio_id: 'com-sur-03',
    comercio_nombre: 'Farmacia del Valle',
    direccion: 'Av. Moreno Sur 910',
    zona: 'SUR-01',
    estado: 'Rechazado',
    motivo_rechazo: 'Tiene stock suficiente de bebidas',
    hora_visita: '11:15 hs',
    fecha: new Date().toISOString().split('T')[0],
    latitud: -27.8070,
    longitud: -64.2560,
    monto_total: 0,
  },
  {
    id_visita: 'vis-104',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    vendedor_id: 'vend-002',
    vendedor_nombre: 'Mariano Gómez',
    comercio_id: 'com-centro-01',
    comercio_nombre: 'Kiosco Peatonal Central',
    direccion: 'Peatonal Tucumán 120',
    zona: 'CENTRO-01',
    estado: 'Venta',
    hora_visita: '11:45 hs',
    fecha: new Date().toISOString().split('T')[0],
    latitud: -27.7885,
    longitud: -64.2615,
    monto_total: 24500,
    forma_pago: 'Efectivo',
    items: [
      { nombre: 'Coca Cola Sabor Original 2.25L', cantidad: 6, precio_unitario: 2650, subtotal: 15900 },
      { nombre: 'Galletitas Chocolinas Bagley 250g', cantidad: 4, precio_unitario: 1350, subtotal: 5400 },
      { nombre: 'Agua Mineral Villavicencio 1.5L', cantidad: 3, precio_unitario: 1066, subtotal: 3200 },
    ],
  },
  {
    id_visita: 'vis-105',
    tenant_id: '11111111-1111-4111-8111-111111111111',
    vendedor_id: 'vend-002',
    vendedor_nombre: 'Mariano Gómez',
    comercio_id: 'com-centro-02',
    comercio_nombre: 'Almacén Don Bosco',
    direccion: 'Mitre 340',
    zona: 'CENTRO-01',
    estado: 'Cerrado',
    motivo_rechazo: 'Local cerrado por duelo comercial',
    hora_visita: '12:20 hs',
    fecha: new Date().toISOString().split('T')[0],
    latitud: -27.7915,
    longitud: -64.2590,
    monto_total: 0,
  },
];

export class SupervisorService {
  private static instance: SupervisorService;

  private constructor() {
    this.initSeedsIfEmpty();
  }

  public static getInstance(): SupervisorService {
    if (!SupervisorService.instance) {
      SupervisorService.instance = new SupervisorService();
    }
    return SupervisorService.instance;
  }

  private initSeedsIfEmpty() {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY_VENDEDORES)) {
      localStorage.setItem(STORAGE_KEY_VENDEDORES, JSON.stringify(SEED_VENDEDORES));
    }
    if (!localStorage.getItem(STORAGE_KEY_ZONAS)) {
      localStorage.setItem(STORAGE_KEY_ZONAS, JSON.stringify(SEED_ZONAS));
    }
    if (!localStorage.getItem(STORAGE_KEY_VISITAS)) {
      localStorage.setItem(STORAGE_KEY_VISITAS, JSON.stringify(SEED_VISITAS));
    }
    if (!localStorage.getItem(STORAGE_KEY_PRODUCTOS)) {
      const productosBase: ProductoTenant[] = DEFAULT_CATALOGO.map((p) => ({
        id_producto: p.id_producto,
        tenant_id: '11111111-1111-4111-8111-111111111111',
        nombre: p.nombre,
        categoria: p.categoria,
        precio: p.precio_vendedor,
        stock: p.stock_actual,
        activo: true,
      }));
      localStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(productosBase));
    }
  }

  // =========================================================================
  // 1. GESTIÓN DE VENDEDORES (ABM con PIN de 4 dígitos y RLS de Tenant)
  // =========================================================================
  public async getVendedores(tenantId: string | null): Promise<VendedorAuditoria[]> {
    // 1. Intentar consultar Supabase con RLS
    try {
      let query = supabase.from('usuarios').select('*').eq('rol', 'Vendedor');
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const local = this.getLocalVendedores(tenantId);
        // Mezclar con estados GPS y teléfonos locales
        return data.map((u: any) => {
          const loc = local.find((l) => l.id_usuario === u.id_usuario || l.email === u.email);
          return {
            id_usuario: u.id_usuario,
            tenant_id: u.tenant_id,
            nombre_completo: u.nombre_completo,
            email: u.email,
            telefono: loc?.telefono || '+54 9 385 000-0000',
            pin: u.pin || '1234',
            activo: true,
            zona_asignada: loc?.zona_asignada || 'SUR-01',
            jornada_iniciada: loc?.jornada_iniciada ?? true,
            ultima_conexion: loc?.ultima_conexion || 'Hace 10 min',
            gps_lat: loc?.gps_lat || -27.8040,
            gps_lng: loc?.gps_lng || -64.2595,
          };
        });
      }
    } catch {
      // fallback a local
    }

    return this.getLocalVendedores(tenantId);
  }

  private getLocalVendedores(tenantId: string | null): VendedorAuditoria[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VENDEDORES);
      const list: VendedorAuditoria[] = raw ? JSON.parse(raw) : SEED_VENDEDORES;
      if (!tenantId) return list;
      return list.filter((v) => v.tenant_id === tenantId || !v.tenant_id);
    } catch {
      return SEED_VENDEDORES;
    }
  }

  public async crearVendedor(payload: {
    tenant_id: string;
    nombre_completo: string;
    email: string;
    telefono: string;
    pin: string;
    zona_asignada: string;
  }): Promise<{ success: boolean; vendedor?: VendedorAuditoria; message: string }> {
    if (!payload.nombre_completo.trim()) {
      return { success: false, message: 'El nombre completo es obligatorio.' };
    }
    if (!payload.email.includes('@')) {
      return { success: false, message: 'Ingrese un correo electrónico válido.' };
    }
    if (!/^\d{4}$/.test(payload.pin)) {
      return { success: false, message: 'El PIN de acceso móvil debe tener exactamente 4 dígitos numéricos.' };
    }

    let vendedorId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : '33333333-4444-4555-8666-' + Date.now().toString().slice(-12);

    // 1. Guardar en Supabase tabla usuarios
    try {
      const { data: dbData, error: dbErr } = await supabase.from('usuarios').insert({
        tenant_id: payload.tenant_id,
        email: payload.email.trim().toLowerCase(),
        pin: payload.pin,
        rol: 'Vendedor',
        nombre_completo: payload.nombre_completo.trim(),
        telefono: payload.telefono.trim(),
        zona_asignada: payload.zona_asignada || 'SUR-01',
        activo: true,
      }).select().single();

      if (!dbErr && dbData && dbData.id_usuario) {
        vendedorId = dbData.id_usuario;
      }
    } catch (err) {
      console.warn('Fallo inserción vendedor en Supabase:', err);
    }

    const nuevoVendedor: VendedorAuditoria = {
      id_usuario: vendedorId,
      tenant_id: payload.tenant_id,
      nombre_completo: payload.nombre_completo.trim(),
      email: payload.email.trim().toLowerCase(),
      telefono: payload.telefono.trim(),
      pin: payload.pin,
      activo: true,
      zona_asignada: payload.zona_asignada || 'SUR-01',
      jornada_iniciada: false,
      ultima_conexion: 'Registrado recién',
      gps_lat: -27.8040 + (Math.random() - 0.5) * 0.02,
      gps_lng: -64.2595 + (Math.random() - 0.5) * 0.02,
    };

    // 2. Guardar en LocalStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VENDEDORES);
      const list: VendedorAuditoria[] = raw ? JSON.parse(raw) : SEED_VENDEDORES;
      list.push(nuevoVendedor);
      localStorage.setItem(STORAGE_KEY_VENDEDORES, JSON.stringify(list));
    } catch {
      // noop
    }

    return {
      success: true,
      vendedor: nuevoVendedor,
      message: `Vendedor ${nuevoVendedor.nombre_completo} creado con éxito. PIN: ${nuevoVendedor.pin}`,
    };
  }

  public async actualizarVendedor(idUsuario: string, datos: Partial<VendedorAuditoria>): Promise<boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VENDEDORES);
      const list: VendedorAuditoria[] = raw ? JSON.parse(raw) : SEED_VENDEDORES;
      const idx = list.findIndex((v) => v.id_usuario === idUsuario);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...datos };
        localStorage.setItem(STORAGE_KEY_VENDEDORES, JSON.stringify(list));
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Genera el enlace de invitación de WhatsApp con credenciales listas para enviar al vendedor.
   */
  public generarEnlaceInvitacionVendedor(vendedor: VendedorAuditoria, empresaNombre: string): string {
    const telefonoLimpio = vendedor.telefono.replace(/\D/g, '');
    const mensaje = [
      `¡Hola ${vendedor.nombre_completo}!`,
      `Te damos la bienvenida al equipo de preventa de *${empresaNombre}*.`,
      ``,
      `*Tus accesos para la PWA Móvil:*`,
      `• *Email:* ${vendedor.email}`,
      `• *PIN de Seguridad (4 dígitos):* ${vendedor.pin}`,
      `• *Zona Asignada:* ${vendedor.zona_asignada}`,
      ``,
      `*Ingreso desde el celular:*`,
      `Recuerda instalar la PWA en tu pantalla de inicio para poder tomar pedidos sin conexión a internet.`,
    ].join('\n');

    return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  }

  // =========================================================================
  // 2. GESTIÓN Y EDICIÓN DE ZONAS (Nombres comerciales, Asignaciones)
  // =========================================================================
  public async getZonas(tenantId: string | null): Promise<ZonaSupervision[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ZONAS);
      const list: ZonaSupervision[] = raw ? JSON.parse(raw) : SEED_ZONAS;
      if (!tenantId) return list;
      return list.filter((z) => z.tenant_id === tenantId || !z.tenant_id);
    } catch {
      return SEED_ZONAS;
    }
  }

  public async actualizarNombreZona(idZona: string, nuevoNombreComercial: string): Promise<boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ZONAS);
      const list: ZonaSupervision[] = raw ? JSON.parse(raw) : SEED_ZONAS;
      const idx = list.findIndex((z) => z.id_zona === idZona);
      if (idx !== -1) {
        list[idx].nombre_comercial = nuevoNombreComercial.trim();
        localStorage.setItem(STORAGE_KEY_ZONAS, JSON.stringify(list));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async asignarVendedorAZona(idZona: string, vendedorId: string, vendedorNombre: string): Promise<boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ZONAS);
      const list: ZonaSupervision[] = raw ? JSON.parse(raw) : SEED_ZONAS;
      const idx = list.findIndex((z) => z.id_zona === idZona);
      if (idx !== -1) {
        list[idx].vendedor_id = vendedorId || undefined;
        list[idx].vendedor_nombre = vendedorNombre || undefined;
        localStorage.setItem(STORAGE_KEY_ZONAS, JSON.stringify(list));

        // Actualizar también en el vendedor
        if (vendedorId) {
          await this.actualizarVendedor(vendedorId, { zona_asignada: list[idx].codigo_zona });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // 3. ABM DE CATÁLOGO DE PRODUCTOS DEL TENANT
  // =========================================================================
  public async getProductos(tenantId: string | null): Promise<ProductoTenant[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRODUCTOS);
      const list: ProductoTenant[] = raw ? JSON.parse(raw) : [];
      if (!tenantId) return list;
      return list.filter((p) => p.tenant_id === tenantId || !p.tenant_id);
    } catch {
      return [];
    }
  }

  public async crearProducto(payload: {
    tenant_id: string;
    nombre: string;
    categoria: string;
    precio: number;
    stock: number;
  }): Promise<{ success: boolean; producto?: ProductoTenant; message: string }> {
    if (!payload.nombre.trim()) {
      return { success: false, message: 'El nombre del artículo es obligatorio.' };
    }
    if (payload.precio <= 0) {
      return { success: false, message: 'El precio debe ser mayor a $0.' };
    }

    const newProd: ProductoTenant = {
      id_producto: `prod-${Date.now().toString().slice(-6)}`,
      tenant_id: payload.tenant_id,
      nombre: payload.nombre.trim(),
      categoria: payload.categoria.trim() || 'General',
      precio: payload.precio,
      stock: payload.stock || 50,
      activo: true,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRODUCTOS);
      const list: ProductoTenant[] = raw ? JSON.parse(raw) : [];
      list.unshift(newProd);
      localStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(list));

      // Guardar también en Supabase productos
      await supabase.from('productos').insert({
        id_producto: newProd.id_producto,
        tenant_id: newProd.tenant_id,
        nombre: newProd.nombre,
        precio: newProd.precio,
        activo: true,
      });
    } catch {
      // noop
    }

    return {
      success: true,
      producto: newProd,
      message: `Producto '${newProd.nombre}' añadido correctamente al catálogo.`,
    };
  }

  public async actualizarPrecioProducto(idProducto: string, nuevoPrecio: number): Promise<boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRODUCTOS);
      const list: ProductoTenant[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((p) => p.id_producto === idProducto);
      if (idx !== -1) {
        list[idx].precio = nuevoPrecio;
        localStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(list));
      }
      return true;
    } catch {
      return false;
    }
  }

  public async toggleProductoActivo(idProducto: string): Promise<boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRODUCTOS);
      const list: ProductoTenant[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((p) => p.id_producto === idProducto);
      if (idx !== -1) {
        list[idx].activo = !list[idx].activo;
        localStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(list));
        return list[idx].activo;
      }
      return false;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // 4. AUDITORÍA DE VISITAS Y TICKETS
  // =========================================================================
  public async getVisitas(tenantId: string | null): Promise<VisitaAuditoria[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VISITAS);
      let list: VisitaAuditoria[] = raw ? JSON.parse(raw) : SEED_VISITAS;

      // Obtener también si hay pedidos recién tomados en el offlineStore
      const pedidosOffline = offlineStore.getPedidosPendientes();
      if (pedidosOffline.length > 0) {
        pedidosOffline.forEach((p) => {
          if (!list.some((v) => v.id_visita === p.id_pedido_local)) {
            list.unshift({
              id_visita: p.id_pedido_local,
              tenant_id: p.tenant_id,
              vendedor_id: p.vendedor_id,
              vendedor_nombre: p.vendedor_nombre,
              comercio_id: p.comercio_id,
              comercio_nombre: p.comercio_nombre,
              direccion: 'Av. Belgrano Sur 1420',
              zona: 'SUR-01',
              estado: 'Venta',
              hora_visita: new Date(p.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              fecha: new Date(p.creado_en).toISOString().split('T')[0],
              latitud: -27.8010,
              longitud: -64.2580,
              monto_total: p.total,
              forma_pago: p.forma_pago,
              items: p.items.map((i) => ({
                nombre: i.nombre,
                cantidad: i.cantidad,
                precio_unitario: i.precio_unitario,
                subtotal: i.subtotal,
              })),
              observaciones: p.observaciones,
            });
          }
        });
      }

      if (!tenantId) return list;
      return list.filter((v) => v.tenant_id === tenantId || !v.tenant_id);
    } catch {
      return SEED_VISITAS;
    }
  }

  // =========================================================================
  // 5. EXPORTACIÓN A CSV (Descarga directa en cliente)
  // =========================================================================
  public exportarReporteVentasCSV(visitas: VisitaAuditoria[], nombreEmpresa: string = 'Distribuidora'): void {
    const headers = ['ID Visita', 'Fecha', 'Hora', 'Vendedor', 'Comercio', 'Direccion', 'Zona', 'Estado', 'Monto Total ($)', 'Forma de Pago', 'Motivo Rechazo', 'Observaciones'];
    
    const rows = visitas.map((v) => [
      v.id_visita,
      v.fecha,
      v.hora_visita,
      `"${v.vendedor_nombre.replace(/"/g, '""')}"`,
      `"${v.comercio_nombre.replace(/"/g, '""')}"`,
      `"${v.direccion.replace(/"/g, '""')}"`,
      v.zona,
      v.estado,
      v.monto_total.toString(),
      v.forma_pago || 'N/A',
      `"${(v.motivo_rechazo || '').replace(/"/g, '""')}"`,
      `"${(v.observaciones || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    this.descargarArchivoBlob(csvContent, `reporte_ventas_${nombreEmpresa.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  }

  public exportarCoberturaClientesCSV(comercios: CoberturaClienteItem[], nombreEmpresa: string = 'Distribuidora'): void {
    const headers = ['ID Comercio', 'Nombre Comercio', 'Direccion', 'Zona', 'Categoria', 'Total Visitas', 'Ventas Concretadas', 'Efectividad (%)', 'Ultima Visita', 'Ultimo Estado'];
    
    const rows = comercios.map((c) => [
      c.id_comercio,
      `"${c.nombre.replace(/"/g, '""')}"`,
      `"${c.direccion.replace(/"/g, '""')}"`,
      c.zona,
      c.categoria,
      c.total_visitas.toString(),
      c.ventas_concretadas.toString(),
      `${c.efectividad_pct.toFixed(1)}%`,
      c.ultima_visita,
      c.ultimo_estado,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    this.descargarArchivoBlob(csvContent, `cobertura_clientes_${nombreEmpresa.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  }

  private descargarArchivoBlob(contenido: string, nombreArchivo: string, mimeType: string) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([contenido], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const supervisorService = SupervisorService.getInstance();
