/**
 * PWA MÓVIL DEL VENDEDOR (PREVENTISTA DE CALLE)
 * Módulo 3 - Rutería Móvil, Modo Offline (SyncEngine), Leaflet.js y WhatsApp API
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  List,
  Wifi,
  WifiOff,
  RefreshCw,
  Navigation,
  Phone,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  Minus,
  MessageSquare,
  DollarSign,
  Send,
  AlertTriangle,
  ChevronDown,
  X,
  Store,
  ArrowRight,
  Filter,
  Check,
  LogOut,
  ArrowLeft,
  Package,
  Crosshair,
  Building2
} from 'lucide-react';
import { useRouter } from '../router';
import L from 'leaflet';
import { ViaVentaLogo, WhatsAppIcon } from './ViaVentaLogo';
import { 
  offlineStore, 
  ComercioRuta, 
  ProductoCatalogo, 
  PedidoOffline, 
  SyncStatus 
} from '../services/offlineStore';
import { 
  formatearTicketWhatsApp, 
  generarWhatsAppUrl, 
  abrirWhatsAppTicket,
  TicketCompraPayload 
} from '../services/whatsappService';
import { sessionManager } from '../services/sessionManager';

// Iconos táctiles personalizados con la paleta oficial de ViaVenta para Leaflet
const createLeafletIcon = (estado: ComercioRuta['estado_visita'], index: number, isSelected: boolean = false) => {
  // Brand tokens:
  // - Pendiente: Naranja Alerta #D97706 (bg-amber-600 border-amber-300 text-white)
  // - Venta realizada: Verde Venta #059669 (bg-emerald-600 border-emerald-300 text-white)
  // - Sin compra / rechazado / cerrado: Rojo Inactivo #DC2626 (bg-red-600 border-red-300 text-white)
  // - En selección: Azul Vía #2563EB (bg-blue-600 border-white ring-4 ring-blue-500/50)
  let bgClass = 'bg-amber-500 border-white text-white shadow-xs'; // Pendiente de visita
  let innerIcon = `${index + 1}`;

  if (estado === 'visitado_con_pedido') {
    bgClass = 'bg-emerald-600 border-white text-white shadow-xs'; // Venta realizada
    innerIcon = '✓';
  } else if (estado === 'visitado_sin_pedido') {
    bgClass = 'bg-red-600 border-white text-white shadow-xs'; // Sin venta / cerrado
    innerIcon = '✕';
  }

  if (isSelected) {
    bgClass = 'bg-blue-600 border-white text-white shadow-sm ring-2 ring-blue-500/50 scale-110';
  }

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-7 h-7 rounded-full border-2 shadow-xs flex items-center justify-center font-bold text-xs ${bgClass} transform transition-transform duration-150">
          ${innerIcon}
        </div>
        <div class="w-1.5 h-1.5 bg-slate-500 rounded-full mx-auto -mt-0.5"></div>
      </div>
    `,
    iconSize: [28, 32],
    iconAnchor: [14, 32],
    popupAnchor: [0, -28],
  });
};

export const VendedorPwaMobile: React.FC = () => {
  const { navigate } = useRouter();
  const session = sessionManager.getSession();
  const isSupervisorOrAdmin = session?.usuario?.rol === 'Supervisor' || session?.usuario?.rol === 'SuperAdmin';
  const vendedorNombre = session?.usuario?.nombre_completo || 'Vendedor Preventista';
  const tenantId = session?.tenant_id || '11111111-1111-4111-8111-111111111111';
  const tenantNombre = session?.nombre_empresa || 'Distribuidora Los Andes S.A.';

  // Estados de datos
  const [comercios, setComercios] = useState<ComercioRuta[]>([]);
  const [catalogo, setCatalogo] = useState<ProductoCatalogo[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineStore.getStatus());

  // Estados de interfaz
  const [vistaActiva, setVistaActiva] = useState<'mapa' | 'lista'>('mapa');
  const [comercioSeleccionado, setComercioSeleccionado] = useState<ComercioRuta | null>(null);
  const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false);
  const [modalNoCompraAbierto, setModalNoCompraAbierto] = useState(false);
  const [motivoNoCompra, setMotivoNoCompra] = useState<string>('Tiene stock suficiente');
  
  // Estado del catálogo y toma de pedido
  const [cantidadesPedido, setCantidadesPedido] = useState<Record<string, number>>({});
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [modalConfirmarPedido, setModalConfirmarPedido] = useState(false);
  const [formaPago, setFormaPago] = useState<'Efectivo' | 'Transferencia' | 'Crédito / A cuenta'>('Efectivo');
  const [observacionesPedido, setObservacionesPedido] = useState('');

  // Ticket y WhatsApp
  const [ticketGenerado, setTicketGenerado] = useState<TicketCompraPayload | null>(null);
  const [telefonoClienteInput, setTelefonoClienteInput] = useState('');
  const [whatsappEnviado, setWhatsappEnviado] = useState(false);

  // Estados para Alta de Nuevo Comercio en Calle (Preventista)
  const [modalAltaComercio, setModalAltaComercio] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoDireccion, setNuevoDireccion] = useState('');
  const [nuevoCategoria, setNuevoCategoria] = useState<string>('convenience_store');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoContacto, setNuevoContacto] = useState('');
  const [nuevoLat, setNuevoLat] = useState<string>('-27.8080');
  const [nuevoLng, setNuevoLng] = useState<string>('-64.2610');
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [gpsObtenidoExito, setGpsObtenidoExito] = useState(false);
  const [mensajeExitoAlta, setMensajeExitoAlta] = useState<string | null>(null);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);

  // Referencias para Leaflet Map
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Cargar datos iniciales y suscripción a SyncEngine
  useEffect(() => {
    setComercios(offlineStore.getComerciosRuta());
    setCatalogo(offlineStore.getCatalogo());

    const unsub = offlineStore.subscribe((status) => {
      setSyncStatus(status);
      setComercios(offlineStore.getComerciosRuta());
    });

    return () => unsub();
  }, []);

  // Inicialización y actualización de Leaflet Map
  useEffect(() => {
    if (vistaActiva !== 'mapa') return;

    // Pequeño timeout para permitir que el contenedor monte sus dimensiones
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        // Centroide de inicio: Santiago del Estero (-27.8080, -64.2610)
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([-27.8080, -64.2610], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        leafletMapRef.current = map;
      }

      // Dibujar marcadores
      if (leafletMapRef.current && markersLayerRef.current) {
        markersLayerRef.current.clearLayers();

        const currentComercios = offlineStore.getComerciosRuta();
        const bounds = L.latLngBounds([]);

        currentComercios.forEach((c, idx) => {
          const latLng = L.latLng(c.latitud, c.longitud);
          bounds.extend(latLng);

          const isSelected = comercioSeleccionado?.id_comercio === c.id_comercio;
          const marker = L.marker(latLng, {
            icon: createLeafletIcon(c.estado_visita, idx, isSelected),
          });

          marker.on('click', () => {
            setComercioSeleccionado(c);
            setTelefonoClienteInput(c.telefono || '');
          });

          markersLayerRef.current?.addLayer(marker);
        });

        if (currentComercios.length > 0) {
          leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }

        leafletMapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [vistaActiva, comercios]);

  // Redimensionar Leaflet al cambiar de vista o seleccionar
  useEffect(() => {
    if (leafletMapRef.current) {
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 200);
    }
  }, [vistaActiva, comercioSeleccionado]);

  // Cálculos del pedido actual
  const itemsEnPedido = Object.entries(cantidadesPedido)
    .filter(([_, qty]) => Number(qty) > 0)
    .map(([prodId, qty]) => {
      const cantidadNum = Number(qty);
      const prod = catalogo.find((p) => p.id_producto === prodId)!;
      return {
        id_producto: prod.id_producto,
        nombre: prod.nombre,
        cantidad: cantidadNum,
        precio_unitario: prod.precio_vendedor,
        subtotal: cantidadNum * prod.precio_vendedor,
      };
    });

  const subtotalPedido = itemsEnPedido.reduce((acc, i) => acc + i.subtotal, 0);
  const totalItemsCount = itemsEnPedido.reduce((acc, i) => acc + i.cantidad, 0);

  // Manejadores de cantidad
  const handleModificarCantidad = (prodId: string, delta: number) => {
    setCantidadesPedido((prev) => {
      const actual = prev[prodId] || 0;
      const nuevo = Math.max(0, actual + delta);
      if (nuevo === 0) {
        const copia = { ...prev };
        delete copia[prodId];
        return copia;
      }
      return { ...prev, [prodId]: nuevo };
    });
  };

  // Confirmar y registrar venta
  const handleConfirmarVenta = () => {
    if (!comercioSeleccionado || itemsEnPedido.length === 0) return;

    const nuevoPedido = offlineStore.registrarPedidoOffline({
      tenant_id: tenantId,
      vendedor_id: session?.usuario?.id_usuario || 'vend-001',
      vendedor_nombre: vendedorNombre,
      comercio_id: comercioSeleccionado.id_comercio,
      comercio_nombre: comercioSeleccionado.nombre,
      telefono_cliente: telefonoClienteInput,
      items: itemsEnPedido,
      subtotal: subtotalPedido,
      total: subtotalPedido,
      forma_pago: formaPago,
      observaciones: observacionesPedido || undefined,
    });

    // Preparar el ticket para WhatsApp
    const ticketPayload: TicketCompraPayload = {
      nombreEmpresa: tenantNombre,
      nombreComercio: comercioSeleccionado.nombre,
      direccionComercio: comercioSeleccionado.direccion,
      telefonoCliente: telefonoClienteInput,
      fecha: new Date(),
      items: itemsEnPedido.map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precio_unitario,
        subtotal: i.subtotal,
      })),
      total: subtotalPedido,
      formaPago,
      vendedorNombre,
      observaciones: observacionesPedido || undefined,
    };

    setTicketGenerado(ticketPayload);
    setModalConfirmarPedido(false);
    setModalVisitaAbierto(false);
    setCantidadesPedido({});
    setObservacionesPedido('');
    setWhatsappEnviado(false);
    setComercios(offlineStore.getComerciosRuta());
  };

  // Registrar visita sin venta
  const handleRegistrarNoCompra = () => {
    if (!comercioSeleccionado) return;

    offlineStore.registrarVisitaSinVentaOffline({
      tenant_id: tenantId,
      comercio_id: comercioSeleccionado.id_comercio,
      vendedor_id: session?.usuario?.id_usuario || 'vend-001',
      motivo_no_compra: motivoNoCompra,
    });

    setModalNoCompraAbierto(false);
    setComercioSeleccionado(null);
    setComercios(offlineStore.getComerciosRuta());
  };

  // Manejador para capturar ubicación GPS del dispositivo móvil del vendedor
  const handleCapturarGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorAlta('La geolocalización no está soportada en este navegador.');
      return;
    }
    setObteniendoGps(true);
    setErrorAlta(null);
    setGpsObtenidoExito(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNuevoLat(pos.coords.latitude.toFixed(6));
        setNuevoLng(pos.coords.longitude.toFixed(6));
        setObteniendoGps(false);
        setGpsObtenidoExito(true);
      },
      (err) => {
        console.warn('Error GPS:', err);
        // Si el usuario no dio permiso o está en un emulador, usar centroide actual del mapa
        if (leafletMapRef.current) {
          const center = leafletMapRef.current.getCenter();
          setNuevoLat(center.lat.toFixed(6));
          setNuevoLng(center.lng.toFixed(6));
          setGpsObtenidoExito(true);
        }
        setObteniendoGps(false);
        setErrorAlta('No se pudo acceder al GPS. Se utilizaron las coordenadas del centro del mapa.');
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  };

  // Manejador para dar de alta el nuevo comercio y actualizar el mapa
  const handleGuardarNuevoComercio = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlta(null);

    if (!nuevoNombre.trim()) {
      setErrorAlta('El nombre de la empresa o comercio es obligatorio.');
      return;
    }
    if (!nuevoDireccion.trim()) {
      setErrorAlta('La dirección o calle/altura es obligatoria.');
      return;
    }

    const latNum = parseFloat(nuevoLat);
    const lngNum = parseFloat(nuevoLng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorAlta('Coordenadas geográficas inválidas.');
      return;
    }

    // Dar de alta a través de offlineStore
    const comercioAlta = offlineStore.agregarNuevoComercioRuta({
      nombre: nuevoNombre.trim(),
      direccion: nuevoDireccion.trim(),
      telefono: nuevoTelefono.trim() || undefined,
      categoria: nuevoCategoria,
      latitud: latNum,
      longitud: lngNum,
      estado_visita: 'pendiente',
    });

    // Actualizar lista local
    const listaActualizada = offlineStore.getComerciosRuta();
    setComercios(listaActualizada);

    // Cambiar a vista de mapa si estaba en lista para ver el punto recién creado
    setVistaActiva('mapa');

    // Seleccionar automáticamente el comercio creado
    setComercioSeleccionado(comercioAlta);
    setTelefonoClienteInput(comercioAlta.telefono || '');

    // Centrar mapa suavemente en la nueva coordenada
    if (leafletMapRef.current) {
      setTimeout(() => {
        leafletMapRef.current?.flyTo([latNum, lngNum], 16, { duration: 1 });
      }, 150);
    }

    // Resetear formulario y cerrar modal
    setNuevoNombre('');
    setNuevoDireccion('');
    setNuevoTelefono('');
    setNuevoContacto('');
    setGpsObtenidoExito(false);
    setModalAltaComercio(false);

    // Feedback visual
    setMensajeExitoAlta(`¡Comercio "${comercioAlta.nombre}" agregado con éxito a tu mapa!`);
    setTimeout(() => {
      setMensajeExitoAlta(null);
    }, 4500);
  };

  // Filtro de productos
  const categoriasUnicas = ['Todas', ...Array.from(new Set(catalogo.map((p) => p.categoria)))];
  const productosFiltrados = catalogo.filter((prod) => {
    const coincideTexto =
      prod.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
      prod.categoria.toLowerCase().includes(busquedaProducto.toLowerCase());
    const coincideCat = categoriaSeleccionada === 'Todas' || prod.categoria === categoriaSeleccionada;
    return coincideTexto && coincideCat;
  });

  // Estadísticas del día
  const visitadosConVenta = comercios.filter((c) => c.estado_visita === 'visitado_con_pedido').length;
  const visitadosSinVenta = comercios.filter((c) => c.estado_visita === 'visitado_sin_pedido').length;
  const pendientes = comercios.filter((c) => c.estado_visita === 'pendiente').length;

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full max-w-lg mx-auto md:border-x md:border-slate-200 bg-slate-50 text-slate-900 overflow-hidden relative font-sans shadow-sm">
      {/* 1. BARRA SUPERIOR MOBILE (HEADER OFICIAL VIAVENTA) */}
      <header className="bg-white border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <ViaVentaLogo size="sm" theme="light" showTagline={false} />
          <div className="border-l border-slate-200 pl-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 tracking-tight">Ruta SUR-01</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate max-w-[110px] sm:max-w-[160px]">{tenantNombre}</p>
          </div>
        </div>

        {/* Indicador Online/Offline + Badge de Rol + Acciones */}
        <div className="flex items-center gap-1.5">
          {/* Badge de Rol Vendedor */}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hidden xs:inline-block">
            Preventista
          </span>

          {/* Pill de Conexión */}
          <button
            onClick={() => offlineStore.syncNow()}
            disabled={syncStatus.isSyncing}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-95 cursor-pointer ${
              syncStatus.isOnline
                ? syncStatus.pendingCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
            title={syncStatus.isOnline ? 'Online - Tocar para sincronizar' : 'Offline - Guardando localmente en dispositivo'}
          >
            {syncStatus.isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                <span className="text-[10px]">Sinc...</span>
              </>
            ) : syncStatus.isOnline ? (
              syncStatus.pendingCount > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span>{syncStatus.pendingCount} pend.</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>En línea</span>
                </>
              )
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                <span className="text-[10px]">Offline</span>
              </>
            )}
          </button>

          {isSupervisorOrAdmin && (
            <button
              onClick={() => navigate('/dashboard')}
              title="Volver al Dashboard de Supervisión"
              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden sm:inline">Panel</span>
            </button>
          )}

          <button
            onClick={() => {
              sessionManager.clearSession();
              navigate('/login');
            }}
            title="Cerrar turno y salir de la aplicación"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. SELECTOR DE VISTA (MAPA / LISTA), ALTA DE COMERCIO Y CONTADORES */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between shrink-0 text-xs gap-2">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setVistaActiva('mapa')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                vistaActiva === 'mapa'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Mapa</span>
            </button>
            <button
              onClick={() => setVistaActiva('lista')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                vistaActiva === 'lista'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-slate-600" />
              <span>Lista ({comercios.length})</span>
            </button>
          </div>

          {/* Botón Alta de Comercio en Calle */}
          <button
            onClick={() => {
              if (leafletMapRef.current) {
                const center = leafletMapRef.current.getCenter();
                setNuevoLat(center.lat.toFixed(6));
                setNuevoLng(center.lng.toFixed(6));
              }
              setModalAltaComercio(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Dar de alta un nuevo comercio en la ruta"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xxs:inline">Alta</span>
          </button>
        </div>

        {/* Resumen de visitas con Tokens Oficiales ViaVenta */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <span className="text-emerald-700 font-semibold flex items-center gap-0.5" title="Ventas realizadas">
            <CheckCircle2 className="w-3.5 h-3.5" /> {visitadosConVenta}
          </span>
          <span className="text-red-600 font-semibold flex items-center gap-0.5" title="Sin venta">
            <XCircle className="w-3.5 h-3.5" /> {visitadosSinVenta}
          </span>
          <span className="text-amber-700 font-semibold flex items-center gap-0.5" title="Pendientes">
            <Clock className="w-3.5 h-3.5" /> {pendientes}
          </span>
        </div>
      </div>

      {/* TOAST DE FEEDBACK TRAS ALTA EXITOSA */}
      {mensajeExitoAlta && (
        <div className="absolute top-12 inset-x-3 z-40 bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensajeExitoAlta}</span>
          </div>
          <button onClick={() => setMensajeExitoAlta(null)} className="text-white/80 hover:text-white p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. CONTENIDO PRINCIPAL: MAPA LEAFLET O LISTA */}
      <div className="flex-1 relative overflow-hidden">
        {/* VISTA MAPA LEAFLET */}
        <div
          className={`absolute inset-0 transition-opacity duration-200 ${
            vistaActiva === 'mapa' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full bg-slate-100" />
          
          {/* Leyenda flotante en el mapa con Colores Oficiales ViaVenta */}
          <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 rounded-xl text-[11px] space-y-1.5 shadow-sm pointer-events-none text-slate-700 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Pendiente de visita</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              <span>Venta realizada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
              <span>Sin venta / Cerrado</span>
            </div>
          </div>

          {/* BOTÓN FLOTANTE (FAB) PARA DAR DE ALTA COMERCIO EN CALLE */}
          {!comercioSeleccionado && (
            <div className="absolute right-3.5 bottom-5 z-[400]">
              <button
                onClick={() => {
                  if (leafletMapRef.current) {
                    const center = leafletMapRef.current.getCenter();
                    setNuevoLat(center.lat.toFixed(6));
                    setNuevoLng(center.lng.toFixed(6));
                  }
                  setModalAltaComercio(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg ring-2 ring-white transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Alta Comercio</span>
              </button>
            </div>
          )}
        </div>

        {/* VISTA LISTA DE COMERCIOS */}
        {vistaActiva === 'lista' && (
          <div className="h-full overflow-y-auto p-4 space-y-2.5 pb-24 bg-slate-50">
            {/* Banner de Alta Rápida de Comercio */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-blue-950">¿Encontraste un local no registrado?</h4>
                <p className="text-[11px] text-blue-800 mt-0.5">Dalo de alta para que aparezca en el mapa y tomar pedidos.</p>
              </div>
              <button
                onClick={() => {
                  if (leafletMapRef.current) {
                    const center = leafletMapRef.current.getCenter();
                    setNuevoLat(center.lat.toFixed(6));
                    setNuevoLng(center.lng.toFixed(6));
                  }
                  setModalAltaComercio(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Alta</span>
              </button>
            </div>

            {comercios.map((comercio, idx) => (
              <div
                key={comercio.id_comercio}
                onClick={() => {
                  setComercioSeleccionado(comercio);
                  setTelefonoClienteInput(comercio.telefono || '');
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  comercioSeleccionado?.id_comercio === comercio.id_comercio
                    ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500/40'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 ${
                        comercio.estado_visita === 'visitado_con_pedido'
                          ? 'bg-emerald-600'
                          : comercio.estado_visita === 'visitado_sin_pedido'
                          ? 'bg-red-600'
                          : 'bg-amber-500'
                      }`}
                    >
                      {comercio.estado_visita === 'visitado_con_pedido' ? '✓' : idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{comercio.nombre}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{comercio.direccion}</p>
                      {comercio.telefono && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{comercio.telefono}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      comercio.estado_visita === 'visitado_con_pedido'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : comercio.estado_visita === 'visitado_sin_pedido'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {comercio.estado_visita === 'visitado_con_pedido'
                      ? 'Vendido'
                      : comercio.estado_visita === 'visitado_sin_pedido'
                      ? 'Sin pedido'
                      : 'Pendiente'}
                  </span>
                </div>

                {comercio.motivo_no_compra && (
                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Motivo: {comercio.motivo_no_compra}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. FLOATING BOTTOM SHEET PARA EL COMERCIO SELECCIONADO */}
      {comercioSeleccionado && !modalVisitaAbierto && !modalConfirmarPedido && (
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 sm:p-5 shadow-xl z-20 rounded-t-2xl animate-in slide-in-from-bottom-4">
          {/* Drag Handle Visual */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3"></div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{comercioSeleccionado.nombre}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    comercioSeleccionado.estado_visita === 'visitado_con_pedido'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : comercioSeleccionado.estado_visita === 'visitado_sin_pedido'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {comercioSeleccionado.estado_visita === 'visitado_con_pedido'
                    ? 'Visitado con Pedido'
                    : comercioSeleccionado.estado_visita === 'visitado_sin_pedido'
                    ? 'Sin Pedido'
                    : 'Pendiente'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{comercioSeleccionado.direccion}</p>
            </div>
            <button
              onClick={() => setComercioSeleccionado(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Botones de acción rápida con respuesta táctil */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${comercioSeleccionado.latitud},${comercioSeleccionado.longitud}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-all active:scale-95"
            >
              <Navigation className="w-4 h-4 text-blue-600 mb-1" />
              <span>Cómo llegar</span>
            </a>

            {comercioSeleccionado.telefono ? (
              <a
                href={`tel:${comercioSeleccionado.telefono}`}
                className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-all active:scale-95"
              >
                <Phone className="w-4 h-4 text-emerald-600 mb-1" />
                <span>Llamar</span>
              </a>
            ) : (
              <button
                disabled
                className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-50 text-slate-400 text-xs font-medium border border-slate-200"
              >
                <Phone className="w-4 h-4 mb-1" />
                <span>Sin teléfono</span>
              </button>
            )}

            <button
              onClick={() => setModalNoCompraAbierto(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-50 hover:bg-red-50 text-red-600 text-xs font-medium border border-slate-200 hover:border-red-200 transition-all active:scale-95 cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-red-600 mb-1" />
              <span>No compró</span>
            </button>
          </div>

          {/* Botón Principal: Iniciar Visita / Tomar Pedido en Azul Vía */}
          <button
            onClick={() => setModalVisitaAbierto(true)}
            className="w-full mt-3 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Iniciar Visita y Tomar Pedido</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* 5. MODAL DE TOMA DE PEDIDO Y CATÁLOGO HÍBRIDO */}
      {modalVisitaAbierto && comercioSeleccionado && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in">
          {/* Header de la venta */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Tomando Pedido</span>
              <h2 className="text-sm font-bold text-slate-900 truncate max-w-[220px]">{comercioSeleccionado.nombre}</h2>
            </div>
            <button
              onClick={() => setModalVisitaAbierto(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg bg-slate-100 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Buscador de productos y categorías */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                placeholder="Buscar por nombre o categoría..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              {busquedaProducto && (
                <button
                  onClick={() => setBusquedaProducto('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categorías con scroll horizontal */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {categoriasUnicas.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    categoriaSeleccionada === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de productos del catálogo */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24 bg-slate-50">
            {productosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se encontraron productos coincidentes
              </div>
            ) : (
              productosFiltrados.map((prod) => {
                const qty = cantidadesPedido[prod.id_producto] || 0;
                return (
                  <div
                    key={prod.id_producto}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all shadow-xs ${
                      qty > 0 ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {prod.imagen_url ? (
                        <img
                          src={prod.imagen_url}
                          alt={prod.nombre}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 border border-slate-200">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{prod.nombre}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs sm:text-sm font-bold text-emerald-600">
                            ${prod.precio_vendedor.toLocaleString('es-AR')}
                          </span>
                          {prod.precio_base > prod.precio_vendedor && (
                            <span className="text-[10px] text-slate-400 line-through">
                              ${prod.precio_base.toLocaleString('es-AR')}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">• {prod.unidad}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Stock: {prod.stock_actual} un.</span>
                      </div>
                    </div>

                    {/* Selector de cantidad táctil rápido con respuesta háptica */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => handleModificarCantidad(prod.id_producto, -1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-transform text-sm font-bold border border-slate-200 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-slate-900 font-mono">{qty}</span>
                          <button
                            onClick={() => handleModificarCantidad(prod.id_producto, 1)}
                            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center active:scale-95 transition-transform text-sm font-bold shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleModificarCantidad(prod.id_producto, 1)}
                          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-300 hover:border-blue-300 text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Barra inferior fija de resumen del pedido */}
          <div className="fixed bottom-0 inset-x-0 p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shadow-lg z-20">
            <div>
              <span className="text-[10px] text-slate-500 font-medium">Total ({totalItemsCount} ítems)</span>
              <div className="text-lg font-bold text-slate-900 leading-tight">
                ${subtotalPedido.toLocaleString('es-AR')}
              </div>
            </div>

            <button
              onClick={() => setModalConfirmarPedido(true)}
              disabled={itemsEnPedido.length === 0}
              className={`px-4 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-2 shadow-xs transition-all ${
                itemsEnPedido.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <span>Continuar Pedido</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL DE CONFIRMACIÓN Y DESGLOSE DEL PEDIDO */}
      {modalConfirmarPedido && comercioSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Resumen de Venta</h3>
                <p className="text-xs text-slate-500">{comercioSeleccionado.nombre}</p>
              </div>
              <button
                onClick={() => setModalConfirmarPedido(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Desglose de ítems */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Ítems Seleccionados
                </div>
                {itemsEnPedido.map((item) => (
                  <div key={item.id_producto} className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                    <div>
                      <span className="text-slate-900 font-semibold">{item.cantidad}x </span>
                      <span className="text-slate-600">{item.nombre}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      ${item.subtotal.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}

                <div className="pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Total Final:</span>
                  <span className="text-emerald-700 font-mono text-base font-bold">
                    ${subtotalPedido.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Selector de forma de pago */}
              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1.5">
                  Forma de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Efectivo', 'Transferencia', 'Crédito / A cuenta'] as const).map((fp) => (
                    <button
                      key={fp}
                      type="button"
                      onClick={() => setFormaPago(fp)}
                      className={`p-2 rounded-lg text-center font-semibold text-xs border transition-all active:scale-95 cursor-pointer ${
                        formaPago === fp
                          ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {fp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teléfono del cliente para WhatsApp */}
              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">
                  Teléfono de WhatsApp del Cliente
                </label>
                <input
                  type="text"
                  value={telefonoClienteInput}
                  onChange={(e) => setTelefonoClienteInput(e.target.value)}
                  placeholder="Ej. 3855123456 (con código de área)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">
                  Notas u Observaciones (Opcional)
                </label>
                <textarea
                  value={observacionesPedido}
                  onChange={(e) => setObservacionesPedido(e.target.value)}
                  rows={2}
                  placeholder="Ej. Entregar antes de las 14:00hs..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setModalConfirmarPedido(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmarVenta}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Venta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE REGISTRO DE NO COMPRA */}
      {modalNoCompraAbierto && comercioSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Registrar Visita Sin Venta</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Seleccione el motivo por el cual no se concretó el pedido en <strong className="text-slate-800">{comercioSeleccionado.nombre}</strong>:
            </p>

            <div className="space-y-2 mb-4">
              {[
                'Local cerrado',
                'Dueño ausente',
                'Tiene stock suficiente',
                'Falta de dinero',
                'Precios elevados',
                'No trabaja con la distribuidora',
              ].map((motivo) => (
                <button
                  key={motivo}
                  type="button"
                  onClick={() => setMotivoNoCompra(motivo)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-medium border transition-all ${
                    motivoNoCompra === motivo
                      ? 'bg-amber-50 text-amber-800 border-amber-500 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {motivo}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalNoCompraAbierto(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarNoCompra}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL POST-VENTA: TICKET Y ENVÍO POR WHATSAPP */}
      {ticketGenerado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[95vh] flex flex-col p-5 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">¡Venta Registrada con Éxito!</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              La venta se guardó localmente en el dispositivo y se sincronizará automáticamente con el servidor central.
            </p>

            {/* Vista previa del Ticket formateado para WhatsApp */}
            <div className="my-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono whitespace-pre-wrap text-slate-800 max-h-56 overflow-y-auto leading-relaxed">
              {formatearTicketWhatsApp(ticketGenerado)}
            </div>

            {/* Botón Destacado: Enviar Comprobante por WhatsApp en Verde Venta */}
            <button
              onClick={() => {
                abrirWhatsAppTicket(ticketGenerado);
                setWhatsappEnviado(true);
              }}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-xs flex items-center justify-center gap-2 mb-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>Enviar Comprobante por WhatsApp</span>
            </button>

            {whatsappEnviado && (
              <p className="text-[11px] text-emerald-700 text-center mb-2 font-medium flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Comprobante enviado a WhatsApp</span>
              </p>
            )}

            <button
              onClick={() => {
                setTicketGenerado(null);
                setComercioSeleccionado(null);
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Continuar con la Ruta
            </button>
          </div>
        </div>
      )}

      {/* 9. MODAL ALTA DE NUEVO COMERCIO EN CALLE (PREVENTISTA) */}
      {modalAltaComercio && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
            {/* Header del Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dar de Alta Comercio</h3>
                  <p className="text-[11px] text-slate-500">Registra un local no tomado en el barrido</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalAltaComercio(false);
                  setErrorAlta(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleGuardarNuevoComercio} className="p-5 overflow-y-auto space-y-4 flex-1">
              {errorAlta && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorAlta}</span>
                </div>
              )}

              {/* Nombre de la Empresa / Comercio */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Nombre del Comercio o Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Despensa San Martín, Supermercado Norte..."
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                />
              </div>

              {/* Rubro Comercial */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Rubro / Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={nuevoCategoria}
                  onChange={(e) => setNuevoCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                >
                  <option value="convenience_store">Almacén / Despensa / Kiosco / Minimercado</option>
                  <option value="grocery_or_supermarket">Supermercado / Autoservicio / Mayorista</option>
                  <option value="pharmacy">Farmacia / Droguería</option>
                  <option value="hardware_store">Ferretería / Bulonera / Pinturería</option>
                  <option value="construction_store">Corralón / Materiales de Construcción</option>
                  <option value="store">Distribuidora / Comercio Minorista General</option>
                </select>
              </div>

              {/* Dirección Física */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Dirección o Calle y Número <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Av. Belgrano Sur 1520, Barrio Centro"
                  value={nuevoDireccion}
                  onChange={(e) => setNuevoDireccion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                />
              </div>

              {/* Teléfono / WhatsApp y Contacto */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    WhatsApp / Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 3854123456"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Contacto / Encargado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan (Titular)"
                    value={nuevoContacto}
                    onChange={(e) => setNuevoContacto(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                </div>
              </div>

              {/* Localización Geográfica GPS para el Mapa */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ubicación en el Mapa</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCapturarGps}
                    disabled={obteniendoGps}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors disabled:opacity-50"
                  >
                    {obteniendoGps ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Capturando...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3" />
                        <span>Obtener mi GPS</span>
                      </>
                    )}
                  </button>
                </div>

                {gpsObtenidoExito && (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coordenadas GPS fijadas con éxito</span>
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Latitud:</span>
                    <input
                      type="text"
                      value={nuevoLat}
                      onChange={(e) => setNuevoLat(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Longitud:</span>
                    <input
                      type="text"
                      value={nuevoLng}
                      onChange={(e) => setNuevoLng(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-800"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Al confirmar, este comercio se ubicará de inmediato con un marcador en tu mapa interactivo.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalAltaComercio(false);
                    setErrorAlta(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dar de Alta en Mapa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
