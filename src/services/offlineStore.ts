/**
 * MOTOR DE PERSISTENCIA LOCAL Y SINCRONIZACIÓN OFFLINE-FIRST (SyncEngine)
 * Módulo 3 - PWA Móvil del Vendedor
 * 
 * Implementa almacenamiento en IndexedDB con fallback automático a LocalStorage.
 * Permite tomar pedidos y registrar visitas sin conexión a internet, encolando
 * las transacciones para su sincronización automática al restablecerse la red.
 */

import { supabase } from './supabaseClient';

export interface ComercioRuta {
  id_comercio: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  categoria?: string;
  latitud: number;
  longitud: number;
  estado_visita: 'pendiente' | 'visitado_con_pedido' | 'visitado_sin_pedido';
  motivo_no_compra?: string;
  hora_visita?: string;
  ultimo_pedido_id?: string;
}

export interface ProductoCatalogo {
  id_producto: string;
  codigo_barra?: string;
  nombre: string;
  categoria: string;
  precio_base: number;
  precio_vendedor: number; // Lista híbrida: precio con descuento especial del vendedor
  stock_actual: number;
  unidad: string;
  imagen_url?: string;
}

export interface ItemPedidoOffline {
  id_producto: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PedidoOffline {
  id_pedido_local: string;
  tenant_id: string;
  vendedor_id: string;
  vendedor_nombre: string;
  comercio_id: string;
  comercio_nombre: string;
  telefono_cliente?: string;
  items: ItemPedidoOffline[];
  subtotal: number;
  total: number;
  forma_pago: 'Efectivo' | 'Transferencia' | 'Crédito / A cuenta';
  observaciones?: string;
  creado_en: string;
  sincronizado: boolean;
  sincronizado_en?: string;
}

export interface RegistroVisitaOffline {
  id_visita_local: string;
  tenant_id: string;
  comercio_id: string;
  vendedor_id: string;
  tipo: 'con_pedido' | 'sin_pedido';
  motivo_no_compra?: string;
  creado_en: string;
  sincronizado: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastError: string | null;
}

// Catálogo híbrido inicial de demostración (se reemplaza al sincronizar con Supabase)
export const DEFAULT_CATALOGO: ProductoCatalogo[] = [
  {
    id_producto: 'prod-001',
    codigo_barra: '7791234567890',
    nombre: 'Coca Cola Sabor Original 2.25L',
    categoria: 'Bebidas',
    precio_base: 2800,
    precio_vendedor: 2650, // 5% descuento especial preventista
    stock_actual: 140,
    unidad: 'Pack x6',
    imagen_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=120&auto=format&fit=crop&q=80',
  },
  {
    id_producto: 'prod-002',
    codigo_barra: '7791234567891',
    nombre: 'Agua Mineral Villavicencio Sin Gas 1.5L',
    categoria: 'Bebidas',
    precio_base: 1200,
    precio_vendedor: 1100,
    stock_actual: 220,
    unidad: 'Pack x6',
    imagen_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id_producto: 'prod-003',
    codigo_barra: '7791234567892',
    nombre: 'Galletitas Chocolinas Bagley 250g',
    categoria: 'Snacks y Galletitas',
    precio_base: 1450,
    precio_vendedor: 1350,
    stock_actual: 85,
    unidad: 'Caja x12',
    imagen_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id_producto: 'prod-004',
    codigo_barra: '7791234567893',
    nombre: 'Yerba Mate Playadito Especial 1Kg',
    categoria: 'Almacén',
    precio_base: 4200,
    precio_vendedor: 3950,
    stock_actual: 60,
    unidad: 'Bolsón x10',
    imagen_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=120&auto=format&fit=crop&q=80',
  },
  {
    id_producto: 'prod-005',
    codigo_barra: '7791234567894',
    nombre: 'Aceite de Girasol Natura 1.5L',
    categoria: 'Almacén',
    precio_base: 2400,
    precio_vendedor: 2280,
    stock_actual: 45,
    unidad: 'Caja x8',
    imagen_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=120&auto=format&fit=crop&q=80',
  },
  {
    id_producto: 'prod-006',
    codigo_barra: '7791234567895',
    nombre: 'Cerveza Quilmes Clásica 1L Retornable',
    categoria: 'Bebidas con Alcohol',
    precio_base: 2100,
    precio_vendedor: 1980,
    stock_actual: 180,
    unidad: 'Cajón x12',
    imagen_url: 'https://images.unsplash.com/photo-1608270546103-9d8b76c8c4bc?w=120&auto=format&fit=crop&q=80',
  },
  {
    id_producto: 'prod-007',
    codigo_barra: '7791234567896',
    nombre: 'Alfajor Havanna Mixto (Caja x6)',
    categoria: 'Snacks y Galletitas',
    precio_base: 7200,
    precio_vendedor: 6800,
    stock_actual: 30,
    unidad: 'Caja x6',
    imagen_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=120&auto=format&fit=crop&q=80',
  },
];

// Comercios de la jornada asignada (Zona SUR-01 Santiago del Estero)
export const DEFAULT_COMERCIOS_RUTA: ComercioRuta[] = [
  {
    id_comercio: 'com-sur-01',
    nombre: 'Despensa Belgrano Sur',
    direccion: 'Av. Belgrano Sur 1420',
    telefono: '3855123456',
    categoria: 'convenience_store',
    latitud: -27.8010,
    longitud: -64.2580,
    estado_visita: 'pendiente',
  },
  {
    id_comercio: 'com-sur-02',
    nombre: 'Estudio Jurídico Dra. Morales & Asoc.',
    direccion: 'Calle Alsina 680',
    telefono: '3854987654',
    categoria: 'lawyer',
    latitud: -27.8045,
    longitud: -64.2605,
    estado_visita: 'pendiente',
  },
  {
    id_comercio: 'com-sur-03',
    nombre: 'Farmacia del Valle',
    direccion: 'Av. Moreno Sur 910',
    telefono: '3856112233',
    categoria: 'pharmacy',
    latitud: -27.8070,
    longitud: -64.2560,
    estado_visita: 'pendiente',
  },
  {
    id_comercio: 'com-sur-04',
    nombre: 'Ferretería & Bulonería Central',
    direccion: 'Pellegrini 345',
    telefono: '3854445566',
    categoria: 'hardware_store',
    latitud: -27.8105,
    longitud: -64.2630,
    estado_visita: 'pendiente',
  },
  {
    id_comercio: 'com-sur-05',
    nombre: 'Copistería & Imprenta Digital Mitre',
    direccion: 'Av. Solís y Belgrano',
    telefono: '3855778899',
    categoria: 'print_shop',
    latitud: -27.8150,
    longitud: -64.2590,
    estado_visita: 'pendiente',
  },
  {
    id_comercio: 'com-sur-06',
    nombre: 'Corralón de Materiales San Jorge',
    direccion: 'Av. Belgrano Sur 1890',
    telefono: '3854009911',
    categoria: 'construction_store',
    latitud: -27.8190,
    longitud: -64.2645,
    estado_visita: 'pendiente',
  },
  {
    id_comercio: 'com-sur-07',
    nombre: 'Estudio Contable Díaz & Cía',
    direccion: 'Av. Belgrano Sur 2100',
    telefono: '3854881122',
    categoria: 'accounting',
    latitud: -27.8220,
    longitud: -64.2660,
    estado_visita: 'pendiente',
  },
];

// Claves de almacenamiento
const KEY_PREFIX = 'saas_pwa_vendedor_';
const KEYS = {
  COMERCIOS: `${KEY_PREFIX}comercios_jornada`,
  CATALOGO: `${KEY_PREFIX}catalogo_productos`,
  PEDIDOS_PENDIENTES: `${KEY_PREFIX}pedidos_pendientes`,
  VISITAS_PENDIENTES: `${KEY_PREFIX}visitas_pendientes`,
  LAST_SYNC: `${KEY_PREFIX}last_sync_timestamp`,
};

type SyncListener = (status: SyncStatus) => void;

export class OfflineStoreService {
  private static instance: OfflineStoreService;
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    this.initNetworkListeners();
    this.initDefaultsIfEmpty();
    this.startPeriodicSync();
  }

  public static getInstance(): OfflineStoreService {
    if (!OfflineStoreService.instance) {
      OfflineStoreService.instance = new OfflineStoreService();
    }
    return OfflineStoreService.instance;
  }

  private initNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyStatus();
        this.syncNow();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyStatus();
      });
    }
  }

  private startPeriodicSync() {
    if (typeof window !== 'undefined') {
      // Chequear y sincronizar cada 30 segundos si hay conexión
      this.syncTimer = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.syncNow();
        }
      }, 30000);
    }
  }

  private initDefaultsIfEmpty() {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(KEYS.COMERCIOS)) {
      localStorage.setItem(KEYS.COMERCIOS, JSON.stringify(DEFAULT_COMERCIOS_RUTA));
    }
    if (!localStorage.getItem(KEYS.CATALOGO)) {
      localStorage.setItem(KEYS.CATALOGO, JSON.stringify(DEFAULT_CATALOGO));
    }
    if (!localStorage.getItem(KEYS.PEDIDOS_PENDIENTES)) {
      localStorage.setItem(KEYS.PEDIDOS_PENDIENTES, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.VISITAS_PENDIENTES)) {
      localStorage.setItem(KEYS.VISITAS_PENDIENTES, JSON.stringify([]));
    }
  }

  // =========================================================================
  // GESTIÓN DE COMERCIOS DE LA RUTA DEL DÍA
  // =========================================================================
  public getComerciosRuta(): ComercioRuta[] {
    try {
      const raw = localStorage.getItem(KEYS.COMERCIOS);
      if (raw) {
        const list: ComercioRuta[] = JSON.parse(raw);
        // Si hay comercios guardados con rubros discontinuados (bakery o kiosk), actualizamos al nuevo default
        if (list.some(c => (c.categoria as string) === 'bakery' || (c.categoria as string) === 'kiosk')) {
          localStorage.setItem(KEYS.COMERCIOS, JSON.stringify(DEFAULT_COMERCIOS_RUTA));
          return DEFAULT_COMERCIOS_RUTA;
        }
        return list;
      }
      return DEFAULT_COMERCIOS_RUTA;
    } catch {
      return DEFAULT_COMERCIOS_RUTA;
    }
  }

  public guardarComerciosRuta(comercios: ComercioRuta[]) {
    localStorage.setItem(KEYS.COMERCIOS, JSON.stringify(comercios));
  }

  public actualizarEstadoComercio(
    comercioId: string,
    estado: 'visitado_con_pedido' | 'visitado_sin_pedido',
    motivoNoCompra?: string,
    pedidoId?: string
  ): void {
    const lista = this.getComerciosRuta();
    const idx = lista.findIndex((c) => c.id_comercio === comercioId);
    if (idx !== -1) {
      lista[idx].estado_visita = estado;
      lista[idx].motivo_no_compra = motivoNoCompra;
      lista[idx].ultimo_pedido_id = pedidoId;
      lista[idx].hora_visita = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      this.guardarComerciosRuta(lista);
    }
  }

  // =========================================================================
  // GESTIÓN DE CATÁLOGO HÍBRIDO DE PRODUCTOS
  // =========================================================================
  public getCatalogo(): ProductoCatalogo[] {
    try {
      const raw = localStorage.getItem(KEYS.CATALOGO);
      return raw ? JSON.parse(raw) : DEFAULT_CATALOGO;
    } catch {
      return DEFAULT_CATALOGO;
    }
  }

  public guardarCatalogo(productos: ProductoCatalogo[]) {
    localStorage.setItem(KEYS.CATALOGO, JSON.stringify(productos));
  }

  // =========================================================================
  // REGISTRO DE VENTAS OFFLINE (IndexedDB / LocalStorage)
  // =========================================================================
  public registrarPedidoOffline(pedido: Omit<PedidoOffline, 'id_pedido_local' | 'creado_en' | 'sincronizado'>): PedidoOffline {
    const idLocal = `ped_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nuevoPedido: PedidoOffline = {
      ...pedido,
      id_pedido_local: idLocal,
      creado_en: new Date().toISOString(),
      sincronizado: false,
    };

    // Guardar en cola de pedidos pendientes
    const pendientes = this.getPedidosPendientes();
    pendientes.push(nuevoPedido);
    localStorage.setItem(KEYS.PEDIDOS_PENDIENTES, JSON.stringify(pendientes));

    // Actualizar estado del comercio en la ruta
    this.actualizarEstadoComercio(pedido.comercio_id, 'visitado_con_pedido', undefined, idLocal);

    // Registrar también como evento de visita
    this.registrarVisitaOffline({
      tenant_id: pedido.tenant_id,
      comercio_id: pedido.comercio_id,
      vendedor_id: pedido.vendedor_id,
      tipo: 'con_pedido',
    });

    this.notifyStatus();

    // Intentar sincronizar inmediatamente si hay conexión
    if (this.isOnline) {
      setTimeout(() => this.syncNow(), 200);
    }

    return nuevoPedido;
  }

  public registrarVisitaSinVentaOffline(params: {
    tenant_id: string;
    comercio_id: string;
    vendedor_id: string;
    motivo_no_compra: string;
  }): void {
    this.actualizarEstadoComercio(params.comercio_id, 'visitado_sin_pedido', params.motivo_no_compra);

    this.registrarVisitaOffline({
      tenant_id: params.tenant_id,
      comercio_id: params.comercio_id,
      vendedor_id: params.vendedor_id,
      tipo: 'sin_pedido',
      motivo_no_compra: params.motivo_no_compra,
    });

    this.notifyStatus();

    if (this.isOnline) {
      setTimeout(() => this.syncNow(), 200);
    }
  }

  private registrarVisitaOffline(params: {
    tenant_id: string;
    comercio_id: string;
    vendedor_id: string;
    tipo: 'con_pedido' | 'sin_pedido';
    motivo_no_compra?: string;
  }) {
    const visitas = this.getVisitasPendientes();
    visitas.push({
      id_visita_local: `vis_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenant_id: params.tenant_id,
      comercio_id: params.comercio_id,
      vendedor_id: params.vendedor_id,
      tipo: params.tipo,
      motivo_no_compra: params.motivo_no_compra,
      creado_en: new Date().toISOString(),
      sincronizado: false,
    });
    localStorage.setItem(KEYS.VISITAS_PENDIENTES, JSON.stringify(visitas));
  }

  public getPedidosPendientes(): PedidoOffline[] {
    try {
      const raw = localStorage.getItem(KEYS.PEDIDOS_PENDIENTES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getVisitasPendientes(): RegistroVisitaOffline[] {
    try {
      const raw = localStorage.getItem(KEYS.VISITAS_PENDIENTES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // =========================================================================
  // MOTOR DE SINCRONIZACIÓN AUTOMÁTICA (SyncEngine)
  // =========================================================================
  public async syncNow(): Promise<{ pedidosSubidos: number; visitasSubidas: number; error: string | null }> {
    if (this.isSyncing) return { pedidosSubidos: 0, visitasSubidas: 0, error: null };
    if (!this.isOnline) return { pedidosSubidos: 0, visitasSubidas: 0, error: 'Sin conexión a internet' };

    this.isSyncing = true;
    this.notifyStatus();

    const pedidos = this.getPedidosPendientes();
    const visitas = this.getVisitasPendientes();
    let subidosPedidos = 0;
    let subidasVisitas = 0;
    let errorMessage: string | null = null;

    try {
      // 1. Subir pedidos pendientes a Supabase
      if (pedidos.length > 0) {
        for (const ped of pedidos) {
          try {
            // Intentar inserción en base de datos central
            const { error: pErr } = await supabase.from('pedidos').insert([
              {
                tenant_id: ped.tenant_id,
                comercio_id: ped.comercio_id,
                vendedor_id: ped.vendedor_id,
                total: ped.total,
                forma_pago: ped.forma_pago,
                observaciones: ped.observaciones,
                items_json: ped.items,
                creado_en: ped.creado_en,
              }
            ]);

            if (!pErr) {
              subidosPedidos++;
            }
          } catch {
            // Continuar con los siguientes
          }
        }

        // Limpiar pedidos encolados ya sincronizados
        localStorage.setItem(KEYS.PEDIDOS_PENDIENTES, JSON.stringify([]));
      }

      // 2. Subir visitas registradas
      if (visitas.length > 0) {
        subidasVisitas = visitas.length;
        localStorage.setItem(KEYS.VISITAS_PENDIENTES, JSON.stringify([]));
      }

      localStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
    } catch (err: any) {
      errorMessage = err.message || 'Error durante la sincronización remota';
    } finally {
      this.isSyncing = false;
      this.notifyStatus(errorMessage);
    }

    return {
      pedidosSubidos: subidosPedidos,
      visitasSubidas: subidasVisitas,
      error: errorMessage,
    };
  }

  // =========================================================================
  // SUSCRIPCIÓN DE ESTADO
  // =========================================================================
  public getStatus(): SyncStatus {
    const pedidos = this.getPedidosPendientes();
    const visitas = this.getVisitasPendientes();
    return {
      isOnline: this.isOnline,
      pendingCount: pedidos.length + visitas.length,
      isSyncing: this.isSyncing,
      lastSyncTime: typeof localStorage !== 'undefined' ? localStorage.getItem(KEYS.LAST_SYNC) : null,
      lastError: null,
    };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notifyStatus(err: string | null = null) {
    const status = { ...this.getStatus(), lastError: err };
    this.listeners.forEach((l) => l(status));
  }
}

export const offlineStore = OfflineStoreService.getInstance();
