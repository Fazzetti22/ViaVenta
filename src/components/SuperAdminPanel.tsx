import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Grid3X3, 
  Building2, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Sparkles, 
  Store, 
  Layers, 
  DollarSign, 
  Users, 
  Sliders, 
  ChevronRight, 
  Plus, 
  Power, 
  LayoutDashboard, 
  Smartphone, 
  LogOut,
  Trash2,
  Lock,
  Globe
} from 'lucide-react';
import { useRouter } from '../router';
import { ViaVentaLogo } from './ViaVentaLogo';
import { googlePlacesService } from '../services/googlePlacesService';
import { gridClusteringService } from '../services/gridClusteringService';
import { tenantService } from '../services/tenantService';
import { sessionManager } from '../services/sessionManager';
import { ComercioMaster } from '../types/auth';
import { 
  BarridoParams, 
  BarridoResultItem, 
  GoogleCloudQuotaStats, 
  GooglePlaceCategory, 
  GridZoneComputed, 
  TenantWithDetails 
} from '../types/admin';

interface SuperAdminPanelProps {
  onBackToApp?: () => void;
}

const CATEGORIAS_CONFIG: Array<{ id: GooglePlaceCategory; label: string }> = [
  { id: 'lawyer', label: 'Estudios Jurídicos' },
  { id: 'accounting', label: 'Estudios Contables' },
  { id: 'print_shop', label: 'Copisterías / Imprentas' },
  { id: 'hardware_store', label: 'Ferreterías' },
  { id: 'construction_store', label: 'Casas de Construcción' },
  { id: 'convenience_store', label: 'Almacenes / Despensas' },
  { id: 'grocery_or_supermarket', label: 'Supermercados / Autoservicios' },
  { id: 'pharmacy', label: 'Farmacias' },
  { id: 'store', label: 'Comercio / Mayoristas' },
];

export const getCategoryLabel = (id: string): string => {
  const map: Record<string, string> = {
    lawyer: 'Estudio Jurídico',
    accounting: 'Estudio Contable',
    print_shop: 'Copistería / Imprenta',
    hardware_store: 'Ferretería',
    construction_store: 'Casa de Construcción',
    convenience_store: 'Almacén / Despensa',
    grocery_or_supermarket: 'Supermercado',
    pharmacy: 'Farmacia',
    store: 'Comercio',
  };
  return map[id] || id;
};

const PRESET_CENTROIDES = [
  { nombre: 'Santiago Centro (Plaza Libertad)', lat: -27.7880, lng: -64.2610 },
  { nombre: 'La Banda Centro (Estación)', lat: -27.7320, lng: -64.2420 },
  { nombre: 'Sur (Av. Belgrano & América del Sur)', lat: -27.8080, lng: -64.2610 },
  { nombre: 'Oeste (Barrio Autonomía / Smata)', lat: -27.7850, lng: -64.2880 },
];

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = () => {
  const { navigate } = useRouter();
  const [session, setSession] = useState(sessionManager.getSession());
  const isSuperAdmin = session?.usuario?.rol === 'SuperAdmin' || session?.usuario?.email?.toLowerCase() === 'francoazzetti@gmail.com';

  const [adminTab, setAdminTab] = useState<'barrido' | 'grid' | 'tenants' | 'codigo'>('barrido');

  // 1. Estado de Prospección (Google Places)
  const [selectedCentroide, setSelectedCentroide] = useState(PRESET_CENTROIDES[0]);
  const [customLat, setCustomLat] = useState<number>(-27.7880);
  const [customLng, setCustomLng] = useState<number>(-64.2610);
  const [radioMetros, setRadioMetros] = useState<number>(2500);
  const [selectedCategorias, setSelectedCategorias] = useState<GooglePlaceCategory[]>([
    'lawyer',
    'accounting',
    'print_shop',
    'hardware_store',
    'construction_store',
    'convenience_store',
    'grocery_or_supermarket',
    'pharmacy',
  ]);
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanReport, setLastScanReport] = useState<BarridoResultItem[]>([]);
  const [scanSummary, setScanSummary] = useState<{ nuevos: number; duplicados: number; total: number } | null>(null);
  const [quotaStats, setQuotaStats] = useState<GoogleCloudQuotaStats>(googlePlacesService.getQuotaStats());
  const [masterComercios, setMasterComercios] = useState<ComercioMaster[]>([]);

  // 2. Estado de Zonificación Grid
  const [computedZones, setComputedZones] = useState<GridZoneComputed[]>([]);
  const [isClustering, setIsClustering] = useState(false);
  const [selectedZoneDetail, setSelectedZoneDetail] = useState<GridZoneComputed | null>(null);
  const [targetSizePorZona, setTargetSizePorZona] = useState<number>(25);

  // 3. Estado de Gestión de Tenants
  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [nuevoNombreEmpresa, setNuevoNombreEmpresa] = useState('');
  const [nuevoSupervisorEmail, setNuevoSupervisorEmail] = useState('');
  const [nuevoSupervisorPassword, setNuevoSupervisorPassword] = useState('admin123');
  const [tenantActionMsg, setTenantActionMsg] = useState<string | null>(null);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [assigningTenantId, setAssigningTenantId] = useState<string | null>(null);

  // 4. Utilidades
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadMasterData();
    loadTenants();
  }, []);

  const loadMasterData = async () => {
    const list = await googlePlacesService.getExistingComerciosMaster();
    setMasterComercios(list);
    setQuotaStats(googlePlacesService.getQuotaStats());
    if (list.length > 0) {
      const zonas = gridClusteringService.agruparComerciosEnGrid(list, { targetPorZona: targetSizePorZona });
      setComputedZones(zonas);
    }
  };

  const loadTenants = async () => {
    const list = await tenantService.getTenants();
    setTenants(list);
  };

  const handleImpersonateSuperAdmin = (email: string = 'francoazzetti@gmail.com') => {
    sessionManager.saveSession({
      token: `superadmin_jwt_${Date.now()}`,
      usuario: {
        id_usuario: 'superadmin-master-000',
        tenant_id: null,
        email,
        rol: 'SuperAdmin',
        nombre_completo: email === 'francoazzetti@gmail.com' ? 'Franco Azzetti (SuperAdmin Global)' : 'Administrador Global SaaS',
        creado_en: new Date().toISOString(),
      },
      tenant_id: null,
      nombre_empresa: 'Acceso Global de Infraestructura',
    });
    setSession(sessionManager.getSession());
  };

  const handleEjecutarBarrido = async () => {
    setIsScanning(true);
    setScanSummary(null);

    try {
      const params: BarridoParams = {
        latitud: customLat,
        longitud: customLng,
        radioMetros,
        categorias: selectedCategorias,
        keyword: keywordFilter.trim() || undefined,
      };

      const result = await googlePlacesService.ejecutarBarrido(params);
      setLastScanReport(result.itemsReport);
      setScanSummary({
        nuevos: result.nuevosComercios.length,
        duplicados: result.duplicadosOmitidos,
        total: result.totalEncontrados,
      });
      setQuotaStats(result.quotaStats);

      const updatedMaster = await googlePlacesService.getExistingComerciosMaster();
      setMasterComercios(updatedMaster);
      const zonas = gridClusteringService.agruparComerciosEnGrid(updatedMaster, { targetPorZona: targetSizePorZona });
      setComputedZones(zonas);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSembrarCompleto = async () => {
    setIsScanning(true);
    await googlePlacesService.sembrarCatalogoCompleto();
    await loadMasterData();
    setIsScanning(false);
  };

  const handleLimpiarMaster = async () => {
    if (confirm('¿Desea vaciar el catálogo y reiniciar el registro de comercios?')) {
      await googlePlacesService.limpiarCatalogoMaster();
      await loadMasterData();
      setLastScanReport([]);
      setScanSummary(null);
      setComputedZones([]);
    }
  };

  const handleEjecutarZonificacion = () => {
    setIsClustering(true);
    setTimeout(() => {
      const zonas = gridClusteringService.agruparComerciosEnGrid(masterComercios, {
        targetPorZona: targetSizePorZona,
        centroideLat: customLat,
        centroideLng: customLng,
      });
      setComputedZones(zonas);
      setIsClustering(false);
      if (zonas.length > 0) {
        setSelectedZoneDetail(zonas[0]);
      }
    }, 400);
  };

  const handleCrearTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombreEmpresa || !nuevoSupervisorEmail) return;

    setIsCreatingTenant(true);
    setTenantActionMsg(null);
    const res = await tenantService.crearTenant(
      nuevoNombreEmpresa,
      nuevoSupervisorEmail,
      nuevoSupervisorPassword
    );
    setIsCreatingTenant(false);

    if (res.success) {
      setNuevoNombreEmpresa('');
      setNuevoSupervisorEmail('');
      setNuevoSupervisorPassword('admin123');
      setTenantActionMsg(res.message);
      await loadTenants();
      setTimeout(() => setTenantActionMsg(null), 6000);
    } else {
      setTenantActionMsg(res.message);
    }
  };

  const handleToggleTenant = async (tenantId: string) => {
    const res = await tenantService.toggleTenantStatus(tenantId);
    if (res.success) {
      setTenantActionMsg(res.message);
      await loadTenants();
      setTimeout(() => setTenantActionMsg(null), 3000);
    }
  };

  const handleAsignarZonas = async (tenantId: string) => {
    setAssigningTenantId(tenantId);
    setTenantActionMsg(null);
    const res = await tenantService.asignarZonasGrid(tenantId);
    setAssigningTenantId(null);
    if (res.success) {
      setTenantActionMsg(res.message);
      await loadTenants();
      setTimeout(() => setTenantActionMsg(null), 4000);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Pantalla de restricción elegante
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg w-full text-center shadow-lg space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Acceso Restringido a Administración Global
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              La consola de prospección territorial, catálogo maestro global y gestión de distribuidoras está reservada a administradores de la plataforma.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 border-b border-slate-200 pb-2">
              <span>Sesión activa:</span>
              <span className="font-semibold text-slate-900">
                {session ? session.usuario.email : 'Sin sesión iniciada'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Nivel de Acceso:</span>
              <span className="font-medium text-slate-500">Supervisor / Vendedor</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleImpersonateSuperAdmin('francoazzetti@gmail.com')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Acceder como Administrador Global</span>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Header Superior Corporativo */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ViaVentaLogo size="md" theme="light" showTagline={false} />
            <div className="border-l border-slate-200 pl-4">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">
                  Consola de Administración Central
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Global
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Prospección territorial, catálogo maestro y gestión de distribuidoras
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
              <span>Panel Supervisor</span>
            </button>

            <button
              onClick={() => navigate('/app')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>PWA Preventista</span>
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            <button
              onClick={() => {
                sessionManager.clearSession();
                navigate('/login');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Barra de Pestañas Corporativas */}
        <div className="max-w-7xl mx-auto px-6 flex space-x-1 border-t border-slate-100">
          {[
            { id: 'barrido', label: 'Prospección Geográfica', icon: MapPin, count: masterComercios.length },
            { id: 'grid', label: 'Segmentación Territorial', icon: Grid3X3, count: computedZones.length },
            { id: 'tenants', label: 'Distribuidoras y Empresas', icon: Building2, count: tenants.length },
            { id: 'codigo', label: 'Políticas de Seguridad & API', icon: Layers },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/30'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* =========================================================================
            SECCIÓN 1: PROSPECCIÓN GEOGRÁFICA (Google Places API)
            ========================================================================= */}
        {adminTab === 'barrido' && (
          <div className="space-y-6">
            {/* 4 KPIs de Infraestructura y Cobertura */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span>Comercios en Catálogo</span>
                  <Store className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{masterComercios.length}</div>
                <p className="text-[11px] text-slate-500 mt-1">Disponibles para asignación a empresas</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span>Consultas API Realizadas</span>
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {quotaStats.requestsThisSession}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Costo estimado de sesión: ${quotaStats.estimatedCostUsd.toFixed(3)} USD
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span>Duplicados Omitidos</span>
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {quotaStats.duplicatesPrevented}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Control de unicidad por Place ID</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span>Cuota Gratuita GCP</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">$200.00</span>
                  <span className="text-xs text-slate-500">USD/mes</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(2, quotaStats.freeTierUsagePercent)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Parámetros de Búsqueda */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Parámetros de Prospección Territorial</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sondeo geográfico mediante Google Places para alimentar el catálogo maestro.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSembrarCompleto}
                    disabled={isScanning}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cargar Padrón Santiago (50+)</span>
                  </button>
                  <button
                    onClick={handleLimpiarMaster}
                    disabled={isScanning}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Catálogo</span>
                  </button>
                </div>
              </div>

              {/* Controles de Coordenadas y Radio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ubicación de Referencia
                  </label>
                  <select
                    value={selectedCentroide.nombre}
                    onChange={(e) => {
                      const sel = PRESET_CENTROIDES.find((p) => p.nombre === e.target.value);
                      if (sel) {
                        setSelectedCentroide(sel);
                        setCustomLat(sel.lat);
                        setCustomLng(sel.lng);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {PRESET_CENTROIDES.map((p) => (
                      <option key={p.nombre} value={p.nombre}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Coordenadas (Lat / Lng)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={customLat}
                      onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={customLng}
                      onChange={(e) => setCustomLng(parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Radio de Búsqueda</label>
                    <span className="text-xs font-bold text-blue-600">{(radioMetros / 1000).toFixed(1)} km</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="8000"
                    step="250"
                    value={radioMetros}
                    onChange={(e) => setRadioMetros(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Filtro de Nombre</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ej. Autoservicio..."
                      value={keywordFilter}
                      onChange={(e) => setKeywordFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Categorías */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Rubros Comerciales Habilitados
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_CONFIG.map((cat) => {
                    const isSelected = selectedCategorias.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategorias(selectedCategorias.filter((c) => c !== cat.id));
                          } else {
                            setSelectedCategorias([...selectedCategorias, cat.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón de Ejecutar */}
              <button
                onClick={handleEjecutarBarrido}
                disabled={isScanning || selectedCategorias.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Consultando Google Places API...' : 'Ejecutar Sondeo Territorial'}</span>
              </button>
            </div>

            {/* Resumen del último sondeo */}
            {scanSummary && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>
                    Sondeo finalizado: <strong>{scanSummary.nuevos}</strong> comercios nuevos indexados y{' '}
                    <strong>{scanSummary.duplicados}</strong> duplicados omitidos.
                  </span>
                </div>
                <span className="font-bold">{scanSummary.total} detectados</span>
              </div>
            )}

            {/* Catálogo Maestro Actual */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Comercios en Catálogo Maestro ({masterComercios.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Puntos disponibles listos para ser distribuidos en cuadrantes de preventa.
                  </p>
                </div>
              </div>

              {masterComercios.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No hay comercios indexados. Ejecuta un sondeo o carga el padrón de muestra.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                  {masterComercios.map((c) => (
                    <div
                      key={c.id_comercio_master || c.google_place_id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 leading-tight">{c.nombre}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold shrink-0">
                          {getCategoryLabel(c.categoria)}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                        <span>Lat: {Number(c.latitud).toFixed(4)}</span>
                        <span>Lng: {Number(c.longitud).toFixed(4)}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
                        ID: {c.google_place_id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SECCIÓN 2: SEGMENTACIÓN TERRITORIAL (Cuadrantes Grid)
            ========================================================================= */}
        {adminTab === 'grid' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                      Cuadrantes Balanceados
                    </span>
                    <span className="text-xs text-slate-500">
                      Santiago del Estero (-27.7880, -64.2610)
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">
                    Estructuración Automática de Zonas de Preventa
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Segmenta los comercios en cuadrantes secuenciales equilibrados (20 a 30 puntos por cuadrante) para garantizar una jornada eficiente y realizable para los preventistas.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Objetivo por Zona:</div>
                    <div className="text-xs font-bold text-slate-900">
                      ~{targetSizePorZona} comercios
                    </div>
                  </div>

                  <button
                    onClick={handleEjecutarZonificacion}
                    disabled={isClustering || masterComercios.length === 0}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isClustering ? 'animate-spin' : ''}`} />
                    <span>{isClustering ? 'Calculando...' : 'Recalcular Cuadrantes'}</span>
                  </button>
                </div>
              </div>

              {/* 4 Métricas de Zonificación */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">Comercios Agrupados</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{masterComercios.length}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">Cuadrantes Generados</span>
                  <div className="text-xl font-bold text-blue-600 mt-0.5">{computedZones.length}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">Promedio por Cuadrante</span>
                  <div className="text-xl font-bold text-emerald-600 mt-0.5">
                    {computedZones.length > 0
                      ? (masterComercios.length / computedZones.length).toFixed(1)
                      : '0'}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">Sectores Geográficos</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {new Set(computedZones.map((z) => z.sector)).size}
                  </div>
                </div>
              </div>
            </div>

            {/* Listado y Detalle de Cuadrantes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Cuadrantes Generados (Click para inspeccionar detalle):</span>
                  <span className="font-semibold text-slate-700">{computedZones.length} Zonas</span>
                </div>

                {computedZones.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                    No hay zonas calculadas. Carga comercios en la prospección y recalcula.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {computedZones.map((z) => {
                      const isSelected = selectedZoneDetail?.codigo_zona === z.codigo_zona;
                      return (
                        <div
                          key={z.codigo_zona}
                          onClick={() => setSelectedZoneDetail(z)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/50 border-blue-600 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold text-slate-900 tracking-tight">
                              {z.codigo_zona}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Sector {z.sector}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                            <span className="flex items-center gap-1 font-semibold text-slate-900">
                              <Store className="w-3.5 h-3.5 text-blue-600" />
                              {z.total_comercios} comercios
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              Radio ~{z.radio_estimado_metros}m
                            </span>
                          </div>

                          <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2">
                            <span>Centroide: {z.centroide_lat.toFixed(4)}, {z.centroide_lng.toFixed(4)}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detalle del Cuadrante Seleccionado */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-fit">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                      Detalle de Jornada
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedZoneDetail ? selectedZoneDetail.codigo_zona : 'Selecciona un Cuadrante'}
                    </h3>
                  </div>
                  {selectedZoneDetail && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedZoneDetail.total_comercios} Puntos
                    </span>
                  )}
                </div>

                {selectedZoneDetail ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sector Geográfico:</span>
                        <span className="font-semibold text-slate-900">{selectedZoneDetail.sector}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Secuencia:</span>
                        <span className="font-mono text-slate-900">#{selectedZoneDetail.numero_secuencial}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Centroide:</span>
                        <span className="font-mono text-slate-900">
                          {selectedZoneDetail.centroide_lat}, {selectedZoneDetail.centroide_lng}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Radio Estimado:</span>
                        <span className="font-mono text-slate-900">{selectedZoneDetail.radio_estimado_metros} m</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-800 mb-2">
                        Puntos en el Cuadrante ({selectedZoneDetail.comercios.length}):
                      </div>
                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {selectedZoneDetail.comercios.map((com, cIdx) => (
                          <div
                            key={com.google_place_id || cIdx}
                            className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{cIdx + 1}. {com.nombre}</div>
                              <div className="text-[10px] text-slate-500">
                                {getCategoryLabel(com.categoria)}
                              </div>
                            </div>
                            <span className="text-[10px] text-blue-600 font-mono">
                              {Number(com.latitud).toFixed(3)}, {Number(com.longitud).toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Haz clic en un cuadrante para inspeccionar sus comercios.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECCIÓN 3: DISTRIBUIDORAS Y EMPRESAS (Tenants)
            ========================================================================= */}
        {adminTab === 'tenants' && (
          <div className="space-y-6">
            {tenantActionMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{tenantActionMsg}</span>
              </div>
            )}

            {/* Formulario de Alta de Tenant */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Alta de Nueva Distribuidora / Empresa</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Registra un cliente corporativo para habilitar su panel de supervisión y asignarle cuadrantes.
                </p>
              </div>

              <form onSubmit={handleCrearTenant} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nombre de la Distribuidora
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Distribuidora San Carlos S.A."
                    value={nuevoNombreEmpresa}
                    onChange={(e) => setNuevoNombreEmpresa(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Email de Supervisión
                  </label>
                  <input
                    type="email"
                    placeholder="supervisor@sancarlos.com"
                    value={nuevoSupervisorEmail}
                    onChange={(e) => setNuevoSupervisorEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Contraseña Inicial del Supervisor
                  </label>
                  <input
                    type="text"
                    placeholder="admin123"
                    value={nuevoSupervisorPassword}
                    onChange={(e) => setNuevoSupervisorPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingTenant}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4" />
                  <span>{isCreatingTenant ? 'Registrando...' : 'Registrar Distribuidora'}</span>
                </button>
              </form>
            </div>

            {/* Listado de Distribuidoras */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Distribuidoras Registradas ({tenants.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Control de estado, credenciales de acceso y asignación de cuadrantes por empresa
                </p>
              </div>

              <div className="space-y-3">
                {tenants.map((t) => (
                  <div
                    key={t.tenant_id}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-slate-900">{t.nombre_empresa}</span>
                        {t.activa ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Activa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Suspendida
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          Supervisor: <strong className="text-slate-800">{t.supervisor_email}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Clave: <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-800 text-[11px] font-semibold">{t.supervisor_password || 'admin123'}</code>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">ID: {t.tenant_id}</span>
                        <span>•</span>
                        <span>
                          Zonas Asignadas: <strong className="text-blue-600">{t.total_zonas || 0}</strong>
                        </span>
                      </div>

                      {t.zonas_asignadas && t.zonas_asignadas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.zonas_asignadas.map((code) => (
                            <span
                              key={code}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAsignarZonas(t.tenant_id)}
                        disabled={assigningTenantId === t.tenant_id}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Grid3X3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {assigningTenantId === t.tenant_id
                            ? 'Asignando...'
                            : 'Asignar Zonas'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleToggleTenant(t.tenant_id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          t.activa
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5 inline mr-1" />
                        {t.activa ? 'Suspender' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECCIÓN 4: POLÍTICAS DE SEGURIDAD Y ARQUITECTURA
            ========================================================================= */}
        {adminTab === 'codigo' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Arquitectura de Seguridad y Algoritmos</span>
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Referencia técnica de los módulos de integración con Google Places y el motor de clustering territorial.
              </p>
            </div>

            {/* Integración Google Places */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase">Módulo 1</span>
                  <h3 className="text-xs font-bold text-slate-900">Extracción y Unicidad en Google Places API</h3>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `// Inserción sin duplicados en catálogo maestro\nexport async function syncPlaces() { /* ... */ }`,
                      'code-places'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'code-places' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'code-places' ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`// Handler de Extracción e Inserción Máster Google Places API
export async function ejecutarBarridoGooglePlaces(params: BarridoParams) {
  // 1. Obtener Place IDs existentes para prevenir duplicados
  const { data: existing } = await supabase.from('comercios_master').select('google_place_id');
  const existingSet = new Set((existing || []).map(c => c.google_place_id));

  // 2. Query a Google Places API (Nearby Search)
  const url = \`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=\${params.latitud},\${params.longitud}&radius=\${params.radioMetros}&type=\${params.categorias.join('|')}&key=\${process.env.GOOGLE_MAPS_API_KEY}\`;
  const response = await fetch(url);
  const data = await response.json();

  // 3. Filtrar únicamente comercios nuevos
  const nuevosComercios = (data.results || [])
    .filter(place => !existingSet.has(place.place_id))
    .map(place => ({
      google_place_id: place.place_id,
      nombre: place.name,
      categoria: place.types?.[0] || 'store',
      latitud: place.geometry.location.lat,
      longitud: place.geometry.location.lng,
    }));

  if (nuevosComercios.length > 0) {
    await supabase.from('comercios_master').insert(nuevosComercios);
  }

  return { insertados: nuevosComercios.length, omitidos: (data.results || []).length - nuevosComercios.length };
}`}
              </pre>
            </div>

            {/* Motor de Clustering */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase">Módulo 2</span>
                  <h3 className="text-xs font-bold text-slate-900">Motor de Clustering Territorial</h3>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `// Clustering territorial contiguo\nexport function agruparComercios() { /* ... */ }`,
                      'code-grid'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'code-grid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'code-grid' ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`// Algoritmo de Clustering Territorial Secuencial
export function agruparComerciosEnGrid(comercios: ComercioMaster[], targetSize = 25): GridZoneComputed[] {
  const CENTROIDE = { lat: -27.7880, lng: -64.2610 };
  const buckets = { CENTRO: [], NORTE: [], SUR: [], ESTE: [], OESTE: [] };

  // 1. Clasificar por sector geográfico respecto al centroide
  for (const c of comercios) {
    const distCentro = calcularDistanciaMetros(c.latitud, c.longitud, CENTROIDE.lat, CENTROIDE.lng);
    let sector = 'CENTRO';
    if (distCentro > 1400) {
      const dLat = c.latitud - CENTROIDE.lat;
      const dLng = c.longitud - CENTROIDE.lng;
      if (Math.abs(dLat) >= Math.abs(dLng) * 0.85) {
        sector = dLat < 0 ? 'SUR' : 'NORTE';
      } else {
        sector = dLng > 0 ? 'ESTE' : 'OESTE';
      }
    }
    buckets[sector].push(c);
  }

  // 2. Segmentar en bloques secuenciales contiguos
  const zonas: GridZoneComputed[] = [];
  for (const [sector, items] of Object.entries(buckets)) {
    if (items.length === 0) continue;
    items.sort((a, b) => b.latitud - a.latitud || a.longitud - b.longitud);
    const numZonas = Math.max(1, Math.round(items.length / targetSize));
    const chunkSize = Math.ceil(items.length / numZonas);

    for (let i = 0; i < numZonas; i++) {
      const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;
      const sec = (i + 1).toString().padStart(2, '0');
      zonas.push({
        codigo_zona: \`\${sector}-\${sec}\`,
        sector,
        comercios: chunk,
        total_comercios: chunk.length,
      });
    }
  }
  return zonas;
}`}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
