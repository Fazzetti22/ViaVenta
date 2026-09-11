import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Filter, 
  FileSpreadsheet, 
  Plus, 
  Edit3, 
  Search, 
  Eye, 
  Send, 
  RefreshCw, 
  UserCheck, 
  ShieldCheck, 
  Package, 
  Layers, 
  FileText, 
  Copy, 
  Check, 
  Smartphone,
  LogOut,
  Compass,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { useRouter } from '../router';
import { ViaVentaLogo } from './ViaVentaLogo';
import { 
  supervisorService, 
  VendedorAuditoria, 
  ZonaSupervision, 
  ProductoTenant, 
  VisitaAuditoria, 
  CoberturaClienteItem 
} from '../services/supervisorService';
import { tenantService } from '../services/tenantService';
import { TenantWithDetails } from '../types/admin';
import { sessionManager } from '../services/sessionManager';
import { esSuperAdminGlobal } from '../services/authService';
import { AuthSession } from '../types/auth';

export const SupervisorDashboard: React.FC = () => {
  const { navigate } = useRouter();

  // Estados de sesión y Multi-Tenant
  const [session, setSession] = useState<AuthSession | null>(sessionManager.getSession());
  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('tenant_losandes');
  const [activeTenantNombre, setActiveTenantNombre] = useState<string>('Distribuidora Los Andes S.R.L.');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);

  // Estados de datos operativos del Tenant
  const [vendedores, setVendedores] = useState<VendedorAuditoria[]>([]);
  const [zonas, setZonas] = useState<ZonaSupervision[]>([]);
  const [productos, setProductos] = useState<ProductoTenant[]>([]);
  const [visitas, setVisitas] = useState<VisitaAuditoria[]>([]);

  // Pestaña activa del Dashboard
  const [activeTab, setActiveTab] = useState<'cobertura' | 'visitas' | 'zonas' | 'vendedores' | 'productos' | 'reportes'>('cobertura');

  // Filtros interactivos para la vista de Cobertura en Mapa
  const [filtroVendedorId, setFiltroVendedorId] = useState<string>('todos');
  const [filtroZona, setFiltroZona] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Modal para ver Comprobante / Ticket de Venta
  const [ticketModalVisita, setTicketModalVisita] = useState<VisitaAuditoria | null>(null);
  const [ticketCopiado, setTicketCopiado] = useState<boolean>(false);

  // Modal Alta de Nuevo Vendedor
  const [modalNuevoVendedorAbierto, setModalNuevoVendedorAbierto] = useState<boolean>(false);
  const [nuevoVendNombre, setNuevoVendNombre] = useState<string>('');
  const [nuevoVendEmail, setNuevoVendEmail] = useState<string>('');
  const [nuevoVendTelefono, setNuevoVendTelefono] = useState<string>('+54 9 385 ');
  const [nuevoVendPin, setNuevoVendPin] = useState<string>('1234');
  const [nuevoVendZona, setNuevoVendZona] = useState<string>('SUR-01');

  // Modal Alta de Nuevo Producto
  const [modalNuevoProductoAbierto, setModalNuevoProductoAbierto] = useState<boolean>(false);
  const [nuevoProdNombre, setNuevoProdNombre] = useState<string>('');
  const [nuevoProdCategoria, setNuevoProdCategoria] = useState<string>('Bebidas');
  const [nuevoProdPrecio, setNuevoProdPrecio] = useState<number>(2500);
  const [nuevoProdStock, setNuevoProdStock] = useState<number>(100);

  // Modal Edición de Nombre de Zona
  const [zonaEditando, setZonaEditando] = useState<ZonaSupervision | null>(null);
  const [nuevoNombreZona, setNuevoNombreZona] = useState<string>('');

  // Buscador en Auditoría de Visitas
  const [busquedaVisita, setBusquedaVisita] = useState<string>('');
  const [filtroEstadoVisita, setFiltroEstadoVisita] = useState<string>('todos');

  // Notificaciones instantáneas en UI
  const [mensajeToast, setMensajeToast] = useState<string | null>(null);

  // Referencias para Leaflet Map
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const mostrarToast = (msg: string) => {
    setMensajeToast(msg);
    setTimeout(() => setMensajeToast(null), 3500);
  };

  // Carga inicial de datos según el tenant seleccionado
  useEffect(() => {
    const cargarTodo = async () => {
      setCargando(true);
      const listaTenants = await tenantService.getTenants();
      setTenants(listaTenants);

      const sess = sessionManager.getSession();
      setSession(sess);

      const superUser = esSuperAdminGlobal(sess?.usuario.email, sess?.usuario.rol);
      setIsSuperAdmin(superUser);

      // Si es supervisor regular, forzar su tenant
      if (!superUser && sess?.tenant_id) {
        setActiveTenantId(sess.tenant_id);
        const match = listaTenants.find((t) => t.tenant_id === sess.tenant_id);
        if (match) setActiveTenantNombre(match.nombre_empresa);
      } else if (superUser && listaTenants.length > 0) {
        const currentMatch = listaTenants.find((t) => t.tenant_id === activeTenantId);
        if (currentMatch) {
          setActiveTenantNombre(currentMatch.nombre_empresa);
        } else {
          setActiveTenantId(listaTenants[0].tenant_id);
          setActiveTenantNombre(listaTenants[0].nombre_empresa);
        }
      }

      await refrescarDatosTenant(activeTenantId);
      setCargando(false);
    };

    cargarTodo();
  }, [activeTenantId]);

  const refrescarDatosTenant = async (tId: string) => {
    const [vends, zons, prods, vis] = await Promise.all([
      supervisorService.getVendedores(tId),
      supervisorService.getZonas(tId),
      supervisorService.getProductos(tId),
      supervisorService.getVisitas(tId),
    ]);
    setVendedores(vends);
    setZonas(zons);
    setProductos(prods);
    setVisitas(vis);
  };

  // KPI Calculations
  const visitasHoy = visitas.length;
  const comerciosTotalEsperados = zonas.reduce((acc, z) => acc + (z.total_comercios || 24), 0);
  const ventasConcretadas = visitas.filter((v) => v.estado === 'Venta');
  const visitasCerradasORechazadas = visitas.filter((v) => v.estado !== 'Venta');
  const totalVentasDia = ventasConcretadas.reduce((acc, v) => acc + v.monto_total, 0);
  const tasaEfectividad = visitasHoy > 0 ? (ventasConcretadas.length / visitasHoy) * 100 : 0;
  const vendedoresEnCalle = vendedores.filter((v) => v.jornada_iniciada).length;

  // Render Leaflet Map cuando la pestaña Cobertura esté activa
  useEffect(() => {
    if (activeTab !== 'cobertura') return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([-27.7880, -64.2610], 14);

        // Tile layer oficial de OpenStreetMap (libre, sin requerir API key)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);
        leafletMapRef.current = map;
      }

      // Dibujar marcadores filtrados
      if (leafletMapRef.current && markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        const bounds = L.latLngBounds([]);

        const visitasFiltradas = visitas.filter((v) => {
          if (filtroVendedorId !== 'todos' && v.vendedor_id !== filtroVendedorId) return false;
          if (filtroZona !== 'todas' && v.zona !== filtroZona) return false;
          if (filtroEstado !== 'todos') {
            if (filtroEstado === 'Venta' && v.estado !== 'Venta') return false;
            if (filtroEstado === 'SinVenta' && v.estado === 'Venta') return false;
          }
          return true;
        });

        visitasFiltradas.forEach((v) => {
          const latLng = L.latLng(v.latitud, v.longitud);
          bounds.extend(latLng);

          const esVenta = v.estado === 'Venta';
          const iconSymbol = esVenta ? '✓' : '✕';

          const customIcon = L.divIcon({
            className: 'custom-supervisor-pin',
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                <div style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 2px solid white; background-color: ${esVenta ? '#059669' : '#dc2626'};">
                  ${iconSymbol}
                </div>
                <div style="position: absolute; bottom: -3px; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid ${esVenta ? '#059669' : '#dc2626'};"></div>
              </div>
            `,
            iconSize: [26, 30],
            iconAnchor: [13, 30],
            popupAnchor: [0, -28],
          });

          const marker = L.marker(latLng, { icon: customIcon });

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 2px;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${v.comercio_nombre}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${v.direccion} • Zona ${v.zona}</div>
              <div style="display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-bottom: 8px; background-color: ${esVenta ? '#ecfdf5' : '#fef2f2'}; color: ${esVenta ? '#047857' : '#b91c1c'}; border: 1px solid ${esVenta ? '#a7f3d0' : '#fecaca'};">
                ${v.estado.toUpperCase()} ${esVenta ? `($${v.monto_total.toLocaleString('es-AR')})` : ''}
              </div>
              <div style="font-size: 11px; color: #334155; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                <strong>Preventista:</strong> ${v.vendedor_nombre}<br/>
                <strong>Hora:</strong> ${v.hora_visita}
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          markersLayerRef.current?.addLayer(marker);
        });

        // Pines de última ubicación GPS conocida de cada preventista
        vendedores.forEach((vend) => {
          if (filtroVendedorId !== 'todos' && vend.id_usuario !== filtroVendedorId) return;

          const latLng = L.latLng(vend.ultima_lat, vend.ultima_lng);
          bounds.extend(latLng);

          const vendIcon = L.divIcon({
            className: 'custom-vend-pin',
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                <div style="width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 2px 6px rgba(37,99,235,0.4); border: 2px solid white; background-color: #2563eb;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div style="position: absolute; bottom: -3px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #2563eb;"></div>
              </div>
            `,
            iconSize: [30, 34],
            iconAnchor: [15, 34],
            popupAnchor: [0, -30],
          });

          const m = L.marker(latLng, { icon: vendIcon });
          m.bindPopup(`
            <div style="font-family: system-ui, sans-serif; padding: 2px;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${vend.nombre_completo}</div>
              <div style="font-size: 11px; color: #64748b;">Preventista • Zona: ${vend.zona_asignada}</div>
              <div style="font-size: 10px; color: #2563eb; margin-top: 4px; font-weight: 600;">
                GPS en tiempo real • ${vend.ultima_conexion}
              </div>
            </div>
          `);
          markersLayerRef.current?.addLayer(m);
        });

        if (bounds.isValid()) {
          leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        } else {
          leafletMapRef.current.setView([-27.7880, -64.2610], 14);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [activeTab, filtroVendedorId, filtroZona, filtroEstado, visitas, vendedores]);

  // Handlers
  const handleCrearVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await supervisorService.crearVendedor({
      tenant_id: activeTenantId,
      nombre_completo: nuevoVendNombre,
      email: nuevoVendEmail,
      telefono: nuevoVendTelefono,
      pin: nuevoVendPin,
      zona_asignada: nuevoVendZona,
    });

    if (res.success) {
      mostrarToast(res.message);
      setModalNuevoVendedorAbierto(false);
      setNuevoVendNombre('');
      setNuevoVendEmail('');
      setNuevoVendTelefono('+54 9 385 ');
      setNuevoVendPin('1234');
      await refrescarDatosTenant(activeTenantId);
    } else {
      alert(res.message);
    }
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await supervisorService.crearProducto({
      tenant_id: activeTenantId,
      nombre: nuevoProdNombre,
      categoria: nuevoProdCategoria,
      precio: nuevoProdPrecio,
      stock: nuevoProdStock,
    });

    if (res.success) {
      mostrarToast(res.message);
      setModalNuevoProductoAbierto(false);
      setNuevoProdNombre('');
      setNuevoProdPrecio(2500);
      await refrescarDatosTenant(activeTenantId);
    } else {
      alert(res.message);
    }
  };

  const handleGuardarNombreZona = async () => {
    if (!zonaEditando) return;
    const ok = await supervisorService.actualizarNombreZona(zonaEditando.id_zona, nuevoNombreZona);
    if (ok) {
      mostrarToast(`Zona '${zonaEditando.codigo_zona}' actualizada.`);
      setZonaEditando(null);
      await refrescarDatosTenant(activeTenantId);
    }
  };

  const handleAsignarVendedorZona = async (idZona: string, vendedorId: string) => {
    const vend = vendedores.find((v) => v.id_usuario === vendedorId);
    const vendNombre = vend ? vend.nombre_completo : '';
    await supervisorService.asignarVendedorAZona(idZona, vendedorId, vendNombre);
    mostrarToast(`Vendedor asignado a la zona correctamente.`);
    await refrescarDatosTenant(activeTenantId);
  };

  const handleLimpiarDatosPrueba = async () => {
    if (confirm('¿Desea limpiar todas las visitas y pedidos de prueba para reiniciar el testing?')) {
      await supervisorService.limpiarDatosTesting(activeTenantId);
      await refrescarDatosTenant(activeTenantId);
      mostrarToast('Datos de prueba reiniciados con éxito');
    }
  };

  const handleExportarVentasCSV = () => {
    supervisorService.exportarReporteVentasCSV(visitas, activeTenantNombre);
    mostrarToast(`Reporte de ventas CSV descargado.`);
  };

  const handleExportarCoberturaCSV = () => {
    const clientesCobertura: CoberturaClienteItem[] = visitas.map((v) => ({
      id_comercio: v.comercio_id,
      nombre: v.comercio_nombre,
      direccion: v.direccion,
      zona: v.zona,
      categoria: 'Comercio Minorista',
      total_visitas: 1,
      ventas_concretadas: v.estado === 'Venta' ? 1 : 0,
      efectividad_pct: v.estado === 'Venta' ? 100 : 0,
      ultima_visita: `${v.fecha} ${v.hora_visita}`,
      ultimo_estado: v.estado,
    }));

    supervisorService.exportarCoberturaClientesCSV(clientesCobertura, activeTenantNombre);
    mostrarToast(`Reporte de cobertura de clientes CSV descargado.`);
  };

  const handleCopiarTicket = () => {
    if (!ticketModalVisita) return;
    const texto = [
      `COMPROBANTE DE VENTA - VIAVENTA`,
      `${activeTenantNombre}`,
      `Cliente: ${ticketModalVisita.comercio_nombre}`,
      `Dirección: ${ticketModalVisita.direccion}`,
      `Fecha: ${ticketModalVisita.fecha} - ${ticketModalVisita.hora_visita}`,
      `---------------------------------`,
      ...(ticketModalVisita.items || []).map(
        (it) => `${it.cantidad}x ${it.nombre} ($${it.precio_unitario.toLocaleString('es-AR')}) = $${it.subtotal.toLocaleString('es-AR')}`
      ),
      `---------------------------------`,
      `TOTAL: $${ticketModalVisita.monto_total.toLocaleString('es-AR')}`,
      `Medio de Pago: ${ticketModalVisita.forma_pago || 'Efectivo'}`,
      `Preventista: ${ticketModalVisita.vendedor_nombre} (Zona: ${ticketModalVisita.zona})`,
    ].join('\n');

    navigator.clipboard.writeText(texto);
    setTicketCopiado(true);
    setTimeout(() => setTicketCopiado(false), 2000);
  };

  const visitasFiltradasTabla = visitas.filter((v) => {
    const q = busquedaVisita.toLowerCase().trim();
    const matchQuery = !q || v.comercio_nombre.toLowerCase().includes(q) || v.vendedor_nombre.toLowerCase().includes(q) || v.zona.toLowerCase().includes(q);
    const matchEstado = filtroEstadoVisita === 'todos' || v.estado === filtroEstadoVisita;
    return matchQuery && matchEstado;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 antialiased">
      {/* Toast flotante */}
      {mensajeToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{mensajeToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* SIDEBAR ENTERPRISE FIJA                                            */}
      {/* =================================================================== */}
      <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col h-screen sticky top-0 z-30">
        {/* Header con Isotipo y Logotipo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100">
          <ViaVentaLogo size="md" theme="light" showTagline={false} />
        </div>

        {/* Info Tenant Activo */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Distribuidora Seleccionada
          </div>
          <div className="text-xs font-bold text-slate-900 truncate mt-1" title={activeTenantNombre}>
            {activeTenantNombre}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] text-slate-500 font-medium">Panel Supervisor Activo</span>
          </div>
        </div>

        {/* Menú Vertical */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {[
            { id: 'cobertura', label: 'Mapa de Cobertura', icon: MapPin },
            { id: 'visitas', label: 'Auditoría de Visitas', icon: FileText, badge: visitas.length },
            { id: 'zonas', label: 'Zonas y Rutas', icon: Layers, badge: zonas.length },
            { id: 'vendedores', label: 'Equipo Preventistas', icon: UserCheck, badge: vendedores.length },
            { id: 'productos', label: 'Catálogo de Artículos', icon: Package, badge: productos.length },
            { id: 'reportes', label: 'Exportar Reportes', icon: FileSpreadsheet },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer del Sidebar: Perfil de Usuario y Logout */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 mb-2">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-slate-900 truncate">
                {session?.usuario.nombre_completo || 'Supervisor de Calle'}
              </div>
              <div className="text-[11px] text-slate-500 truncate font-mono">
                {session?.usuario.email}
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
              {session?.usuario.rol || 'Supervisor'}
            </span>
          </div>

          <button
            onClick={() => {
              sessionManager.clearSession();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* CONTENEDOR PRINCIPAL: HEADER SUPERIOR + ÁREA DE TRABAJO             */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
        {/* Header Superior Limpio */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">
                  {activeTab === 'cobertura' && 'Monitoreo de Cobertura en Calle'}
                  {activeTab === 'visitas' && 'Auditoría de Visitas y Facturación'}
                  {activeTab === 'zonas' && 'Cuadrantes y Rutas de Preventa'}
                  {activeTab === 'vendedores' && 'Equipo de Preventistas y Rutas'}
                  {activeTab === 'productos' && 'Catálogo de Precios y Stock'}
                  {activeTab === 'reportes' && 'Exportación de Datos y Telemetría'}
                </h1>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-semibold text-slate-600">{activeTenantNombre}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ruteo inteligente, auditoría de visitas y telemetría en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isSuperAdmin && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <select
                  value={activeTenantId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setActiveTenantId(tid);
                    const sel = tenants.find((t) => t.tenant_id === tid);
                    if (sel) setActiveTenantNombre(sel.nombre_empresa);
                    mostrarToast(`Empresa activa: ${sel?.nombre_empresa}`);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {tenants.map((t) => (
                    <option key={t.tenant_id} value={t.tenant_id}>
                      {t.nombre_empresa}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isSuperAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Consola SuperAdmin"
              >
                <Compass className="w-3.5 h-3.5 text-purple-600" />
                <span>Consola Master</span>
              </button>
            )}

            <button
              onClick={() => navigate('/app')}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Abrir PWA Móvil"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>PWA Preventista</span>
            </button>

            <button
              onClick={handleLimpiarDatosPrueba}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Limpiar visitas y pedidos de prueba"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />
              <span>Limpiar Pruebas</span>
            </button>

            <button
              onClick={() => refrescarDatosTenant(activeTenantId)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </header>

        {/* Área de Trabajo Central */}
        <main className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* ================================================================= */}
          {/* 4 TARJETAS DE KPIS OPERATIVOS EN MODO CLARO B2B                   */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Visitas */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Visitas Hoy</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{visitasHoy}</span>
                <span className="text-xs text-slate-500">/ {comerciosTotalEsperados} comercios</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (visitasHoy / (comerciosTotalEsperados || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* KPI 2: Tasa de Conversión */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Tasa de Conversión</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">{tasaEfectividad.toFixed(1)}%</span>
                <span className="text-xs text-slate-500">con venta</span>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                {ventasConcretadas.length} pedidos concretados vs. {visitasCerradasORechazadas.length} sin venta
              </p>
            </div>

            {/* KPI 3: Ventas Totales del Día */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Ventas Totales Hoy</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  ${totalVentasDia.toLocaleString('es-AR')}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Ticket promedio: ${ventasConcretadas.length ? Math.round(totalVentasDia / ventasConcretadas.length).toLocaleString('es-AR') : 0}
              </p>
            </div>

            {/* KPI 4: Preventistas en Calle */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Preventistas en Calle</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600">{vendedoresEnCalle}</span>
                <span className="text-xs text-slate-500">/ {vendedores.length} activos</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{vendedoresEnCalle} con jornada iniciada</span>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 1. VISTA: MAPA GENERAL DE COBERTURA EN VIVO                       */}
          {/* ================================================================= */}
          {activeTab === 'cobertura' && (
            <div className="space-y-4">
              {/* Barra de Filtros del Mapa */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span>Filtros de Cobertura:</span>
                  </div>

                  <select
                    value={filtroVendedorId}
                    onChange={(e) => setFiltroVendedorId(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-600"
                  >
                    <option value="todos">Todos los Vendedores ({vendedores.length})</option>
                    {vendedores.map((v) => (
                      <option key={v.id_usuario} value={v.id_usuario}>
                        {v.nombre_completo} ({v.zona_asignada})
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroZona}
                    onChange={(e) => setFiltroZona(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-600"
                  >
                    <option value="todas">Todas las Zonas</option>
                    {zonas.map((z) => (
                      <option key={z.id_zona} value={z.codigo_zona}>
                        {z.codigo_zona} - {z.nombre_comercial}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-600"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="Venta">Con Venta Realizada</option>
                    <option value="SinVenta">Sin Venta / Rechazo</option>
                    <option value="Pendiente">Comercios Pendientes</option>
                  </select>
                </div>

                {/* Leyenda Visual */}
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Con Venta
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Sin Venta
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pendiente
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Preventista GPS
                  </span>
                </div>
              </div>

              {/* Contenedor del Mapa Leaflet */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs relative">
                <div ref={mapContainerRef} className="w-full h-[580px] z-0" />

                {/* Overlay Informativo */}
                <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 p-3 rounded-xl shadow-sm max-w-xs text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Monitoreo Activo de Ruta</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Visualizando actividad de preventistas, última telemetría GPS y estado de cada comercio en tiempo real.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. VISTA: AUDITORÍA DE VISITAS Y VISOR DE TICKETS                 */}
          {/* ================================================================= */}
          {activeTab === 'visitas' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Registro de Visitas Levantadas</h2>
                  <p className="text-xs text-slate-500">
                    Audita los comprobantes emitidos a comercios y motivos de visitas sin compra.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar comercio o preventista..."
                      value={busquedaVisita}
                      onChange={(e) => setBusquedaVisita(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-56"
                    />
                  </div>

                  <select
                    value={filtroEstadoVisita}
                    onChange={(e) => setFiltroEstadoVisita(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-600"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="Venta">Venta Concretada</option>
                    <option value="Rechazado">Rechazado</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
              </div>

              {/* Tabla Corporativa de Alta Densidad */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Comercio</th>
                      <th className="py-3 px-4">Preventista</th>
                      <th className="py-3 px-4">Zona</th>
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Monto Total</th>
                      <th className="py-3 px-4 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                    {visitasFiltradasTabla.map((v) => (
                      <tr key={v.id_visita} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{v.comercio_nombre}</div>
                          <div className="text-[11px] text-slate-500">{v.direccion}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{v.vendedor_nombre}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                            {v.zona}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{v.hora_visita}</td>
                        <td className="py-3 px-4">
                          {v.estado === 'Venta' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Venta Concretada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3" /> {v.estado}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {v.monto_total > 0 ? (
                            <span className="font-bold text-emerald-700">
                              ${v.monto_total.toLocaleString('es-AR')}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {v.estado === 'Venta' ? (
                            <button
                              onClick={() => setTicketModalVisita(v)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ver Ticket</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {v.motivo_rechazo || 'Sin detalle'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3. VISTA: GESTIÓN Y EDICIÓN DE ZONAS (CUADRANTES GRID)           */}
          {/* ================================================================= */}
          {activeTab === 'zonas' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Cuadrantes y Rutas de Preventa</h2>
                  <p className="text-xs text-slate-500">
                    Personaliza los nombres comerciales de las zonas y asigna qué preventista recorre cada sector.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zonas.map((z) => (
                  <div
                    key={z.id_zona}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                          {z.codigo_zona}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                          {z.nombre_comercial}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setZonaEditando(z);
                          setNuevoNombreZona(z.nombre_comercial);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                        title="Editar Nombre Comercial"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5 border-t border-slate-100 pt-3">
                      <div className="flex justify-between">
                        <span>Comercios en cuadrante:</span>
                        <span className="font-bold text-slate-900">{z.total_comercios || 24} locales</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Preventista asignado:</span>
                        <span className="font-bold text-blue-600">
                          {z.vendedor_nombre || 'Sin asignar'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Vincular Preventista a Zona:
                      </label>
                      <select
                        value={z.vendedor_id || ''}
                        onChange={(e) => handleAsignarVendedorZona(z.id_zona, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                      >
                        <option value="">-- Sin Asignar --</option>
                        {vendedores.map((v) => (
                          <option key={v.id_usuario} value={v.id_usuario}>
                            {v.nombre_completo} (Actual: {v.zona_asignada})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 4. VISTA: EQUIPO DE PREVENTISTAS (ABM + PIN + WHATSAPP)           */}
          {/* ================================================================= */}
          {activeTab === 'vendedores' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Equipo de Preventistas</h2>
                  <p className="text-xs text-slate-500">
                    Alta de preventistas con PIN de 4 dígitos para ingreso a la PWA Móvil y envío de credenciales por WhatsApp.
                  </p>
                </div>
                <button
                  onClick={() => setModalNuevoVendedorAbierto(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Preventista</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendedores.map((vend) => {
                  const linkWhatsApp = supervisorService.generarEnlaceInvitacionVendedor(vend, activeTenantNombre);

                  return (
                    <div
                      key={vend.id_usuario}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm">
                            {vend.nombre_completo.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{vend.nombre_completo}</h3>
                            <p className="text-xs text-slate-500">{vend.email}</p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            vend.jornada_iniciada
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {vend.jornada_iniciada ? 'En Ruta' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 border-t border-slate-100 pt-3 text-slate-600">
                        <div className="flex justify-between">
                          <span>Teléfono / WhatsApp:</span>
                          <span className="font-semibold text-slate-900">{vend.telefono}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>PIN Móvil PWA:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-amber-700 border border-slate-200">
                            {vend.pin}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Zona asignada:</span>
                          <span className="font-bold text-blue-600">{vend.zona_asignada}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Última conexión:</span>
                          <span className="text-slate-500">{vend.ultima_conexion}</span>
                        </div>
                      </div>

                      <a
                        href={linkWhatsApp}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Credenciales por WhatsApp</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 5. VISTA: CATÁLOGO DE PRODUCTOS (ABM)                             */}
          {/* ================================================================= */}
          {activeTab === 'productos' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Catálogo de Productos del Tenant</h2>
                  <p className="text-xs text-slate-500">
                    Artículos disponibles para preventa con precios exclusivos por distribuidora.
                  </p>
                </div>
                <button
                  onClick={() => setModalNuevoProductoAbierto(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Producto</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Artículo</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Precio Preventista</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                    {productos.map((p) => (
                      <tr key={p.id_producto} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{p.nombre}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                            {p.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          ${p.precio.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.stock} un.</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {p.activo ? 'Activo' : 'Pausado'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={async () => {
                              const nuevo = prompt(`Nuevo precio para ${p.nombre}:`, p.precio.toString());
                              if (nuevo && !isNaN(Number(nuevo))) {
                                await supervisorService.actualizarPrecioProducto(p.id_producto, Number(nuevo));
                                mostrarToast(`Precio actualizado a $${Number(nuevo).toLocaleString('es-AR')}`);
                                await refrescarDatosTenant(activeTenantId);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Modificar Precio
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 6. VISTA: EXPORTACIÓN DE REPORTES A CSV                           */}
          {/* ================================================================= */}
          {activeTab === 'reportes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reporte General de Ventas (CSV)</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Descarga una planilla con el detalle de cada pedido levantado: Fecha, Preventista, Comercio, Zona, Monto Total, Método de Pago y Observaciones.
                  </p>
                </div>
                <button
                  onClick={handleExportarVentasCSV}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Reporte de Ventas (.CSV)</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reporte de Cobertura de Clientes (CSV)</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Exporta el padrón completo de comercios con su historial de visitas, tasa de efectividad de compra y estado del último recorrido de calle.
                  </p>
                </div>
                <button
                  onClick={handleExportarCoberturaCSV}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Cobertura de Clientes (.CSV)</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL: VISOR DE TICKET / COMPROBANTE WHATSAPP                       */}
      {/* =================================================================== */}
      {ticketModalVisita && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Comprobante de Venta</h3>
              </div>
              <button
                onClick={() => setTicketModalVisita(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-700 space-y-2.5">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold text-slate-900 text-sm">{activeTenantNombre}</div>
                <div className="text-[10px] text-slate-500">Sistema de Preventa & Ruteo</div>
              </div>

              <div className="text-[11px] space-y-0.5 text-slate-600">
                <div><strong>Comercio:</strong> <span className="text-slate-900 font-bold">{ticketModalVisita.comercio_nombre}</span></div>
                <div><strong>Dirección:</strong> {ticketModalVisita.direccion}</div>
                <div><strong>Fecha:</strong> {ticketModalVisita.fecha} ({ticketModalVisita.hora_visita})</div>
                <div><strong>Preventista:</strong> {ticketModalVisita.vendedor_nombre} (Zona {ticketModalVisita.zona})</div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
                {(ticketModalVisita.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <div>
                      <span>{it.cantidad}x </span>
                      <span className="text-slate-900 font-medium">{it.nombre}</span>
                    </div>
                    <span className="font-bold text-emerald-700">${it.subtotal.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm font-black pt-1">
                <span className="text-slate-900">TOTAL:</span>
                <span className="text-emerald-700">${ticketModalVisita.monto_total.toLocaleString('es-AR')}</span>
              </div>

              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-200 flex justify-between">
                <span>Medio: {ticketModalVisita.forma_pago || 'Efectivo'}</span>
                <span>ID: {ticketModalVisita.id_visita}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCopiarTicket}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {ticketCopiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{ticketCopiado ? '¡Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                onClick={() => setTicketModalVisita(null)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ALTA DE NUEVO PREVENTISTA                                    */}
      {/* =================================================================== */}
      {modalNuevoVendedorAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCrearVendedor} className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Alta de Preventista</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoVendedorAbierto(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Martín Benítez"
                  value={nuevoVendNombre}
                  onChange={(e) => setNuevoVendNombre(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="mbenitez@distribuidora.com"
                  value={nuevoVendEmail}
                  onChange={(e) => setNuevoVendEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="+54 9 385 555-1234"
                    value={nuevoVendTelefono}
                    onChange={(e) => setNuevoVendTelefono(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PIN Móvil (4 Dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="1234"
                    value={nuevoVendPin}
                    onChange={(e) => setNuevoVendPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-center text-amber-700 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Zona Inicial Asignada</label>
                <select
                  value={nuevoVendZona}
                  onChange={(e) => setNuevoVendZona(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  {zonas.map((z) => (
                    <option key={z.id_zona} value={z.codigo_zona}>
                      {z.codigo_zona} - {z.nombre_comercial}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalNuevoVendedorAbierto(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Crear y Activar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ALTA DE NUEVO PRODUCTO                                      */}
      {/* =================================================================== */}
      {modalNuevoProductoAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCrearProducto} className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Nuevo Artículo en Catálogo</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoProductoAbierto(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cerveza Quilmes Clásica 1L"
                  value={nuevoProdNombre}
                  onChange={(e) => setNuevoProdNombre(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Bebidas, Almacén..."
                    value={nuevoProdCategoria}
                    onChange={(e) => setNuevoProdCategoria(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Precio Preventista ($)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={nuevoProdPrecio}
                    onChange={(e) => setNuevoProdPrecio(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold text-emerald-700 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Stock Inicial</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={nuevoProdStock}
                  onChange={(e) => setNuevoProdStock(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalNuevoProductoAbierto(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Guardar Artículo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDICIÓN DE NOMBRE COMERCIAL DE ZONA                         */}
      {/* =================================================================== */}
      {zonaEditando && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Editar Nombre de Zona ({zonaEditando.codigo_zona})</h3>
              </div>
              <button
                type="button"
                onClick={() => setZonaEditando(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Asigna un nombre descriptivo o comercial para la cuadrícula <strong className="text-slate-900">{zonaEditando.codigo_zona}</strong>:
              </p>
              <input
                type="text"
                value={nuevoNombreZona}
                onChange={(e) => setNuevoNombreZona(e.target.value)}
                placeholder="Ej. Barrio Belgrano Sur - Ruta A"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setZonaEditando(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarNombreZona}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Guardar Cambio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
