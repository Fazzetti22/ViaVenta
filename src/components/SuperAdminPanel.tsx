import React, { useState, useEffect, useRef } from 'react';
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
  Globe,
  Filter,
  FileText,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Upload,
  Download,
  FileSpreadsheet,
  Compass,
  Eye,
  ExternalLink,
  X
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
  TenantWithDetails,
  GeocodedAddressItem
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

export interface PresetCentroide {
  nombre: string;
  grupo: 'Plazas y Centros Cívicos' | 'Cruces de Avenidas Estratégicos' | 'La Banda y Accesos';
  detalle: string;
  lat: number;
  lng: number;
}

export const PRESET_CENTROIDES: PresetCentroide[] = [
  // 1. Plazas y Centros Cívicos
  {
    nombre: 'Plaza Libertad (Centro Cívico)',
    grupo: 'Plazas y Centros Cívicos',
    detalle: 'Catedral, Casa de Gobierno, Peatonales Tucumán y Absalón Rojas',
    lat: -27.7880,
    lng: -64.2610,
  },
  {
    nombre: 'Plaza San Martín (Belgrano Sur)',
    grupo: 'Plazas y Centros Cívicos',
    detalle: 'Av. Belgrano Sur & Alsina, zona bancaria y gastronómica',
    lat: -27.7915,
    lng: -64.2645,
  },
  {
    nombre: 'Plaza Absalón Rojas (Av. Colón & Libertad)',
    grupo: 'Plazas y Centros Cívicos',
    detalle: 'Cruce Av. Colón con Av. Libertad, B° Congreso / B° Centro',
    lat: -27.7882,
    lng: -64.2718,
  },
  {
    nombre: 'Parque Aguirre (Costanera & Salta)',
    grupo: 'Plazas y Centros Cívicos',
    detalle: 'Costanera Río Dulce, clubes deportivos y paseo recreativo',
    lat: -27.7830,
    lng: -64.2490,
  },
  {
    nombre: 'Plaza Belgrano (Centro La Banda)',
    grupo: 'Plazas y Centros Cívicos',
    detalle: 'Av. Besares & Belgrano, Estación de Trenes La Banda',
    lat: -27.7335,
    lng: -64.2440,
  },
  {
    nombre: 'Plaza Sarmiento (Buenos Aires & 3 de Febrero)',
    grupo: 'Plazas y Centros Cívicos',
    detalle: 'Zona céntrica sur, colegios y comercios de proximidad',
    lat: -27.7968,
    lng: -64.2575,
  },

  // 2. Cruces de Avenidas Principales
  {
    nombre: 'Av. Rivadavia & Av. Belgrano',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Divisoria Belgrano Norte y Sur, corredor central de alto tráfico',
    lat: -27.7862,
    lng: -64.2612,
  },
  {
    nombre: 'Av. Aguirre & Av. Rivadavia',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Cruce zona Oeste, B° Francisco de Aguirre y B° Congreso',
    lat: -27.7850,
    lng: -64.2810,
  },
  {
    nombre: 'Av. Colón & Av. Solís',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Nodo comercial Sur, B° Cabildo, B° Juan XXIII y B° Tradición',
    lat: -27.8105,
    lng: -64.2725,
  },
  {
    nombre: 'Av. Belgrano & Av. Solís',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Eje comercial mayorista, corralones, repuestos y almacenes',
    lat: -27.8106,
    lng: -64.2611,
  },
  {
    nombre: 'Av. Moreno & Av. Alsina',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Eje Hospital Regional, Tribunales y comercios conexos',
    lat: -27.7960,
    lng: -64.2662,
  },
  {
    nombre: 'Av. Belgrano & Av. Lugones',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Eje de conexión Este-Oeste en zona media sur',
    lat: -27.8020,
    lng: -64.2610,
  },
  {
    nombre: 'Av. Colón & Av. Pedro León Gallo',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Acceso comercial a zona Oeste (B° Primera Junta, B° San Martín)',
    lat: -27.7940,
    lng: -64.2720,
  },
  {
    nombre: 'Av. Belgrano & Av. América del Sur',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Acceso Sur (B° Ejército Argentino, Almirante Brown, Campo Contreras)',
    lat: -27.8160,
    lng: -64.2615,
  },
  {
    nombre: 'Av. Independencia & Juncal',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Barrio Belgrano, distribuidoras y comercios barriales',
    lat: -27.8075,
    lng: -64.2435,
  },
  {
    nombre: 'Barrio Autonomía (Av. 27 de Abril & Cruce Smata)',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Nodo comercial autónomo del extremo Oeste',
    lat: -27.8090,
    lng: -64.3035,
  },
  {
    nombre: 'Av. Aguirre & Av. Solís',
    grupo: 'Cruces de Avenidas Estratégicos',
    detalle: 'Circunvalación comercial Suroeste, B° Mariano Moreno',
    lat: -27.8105,
    lng: -64.2850,
  },

  // 3. La Banda y Accesos
  {
    nombre: 'La Banda - Av. San Martín & Aristóbulo del Valle',
    grupo: 'La Banda y Accesos',
    detalle: 'Centro bancario y comercial de La Banda',
    lat: -27.7390,
    lng: -64.2475,
  },
  {
    nombre: 'La Banda - Av. España & Av. Alberdi',
    grupo: 'La Banda y Accesos',
    detalle: 'Corredor comercial y salida hacia autopista',
    lat: -27.7360,
    lng: -64.2505,
  },
  {
    nombre: 'Autopista J.D. Perón & Av. Lugones',
    grupo: 'La Banda y Accesos',
    detalle: 'Cruce interurbano Santiago - La Banda',
    lat: -27.7600,
    lng: -64.2530,
  },
];

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = () => {
  const { navigate } = useRouter();
  const [session, setSession] = useState(sessionManager.getSession());
  const isSuperAdmin = session?.usuario?.rol === 'SuperAdmin' || session?.usuario?.email?.toLowerCase() === 'francoazzetti@gmail.com';

  const [adminTab, setAdminTab] = useState<'barrido' | 'grid' | 'tenants' | 'codigo'>('barrido');

  // 1. Estado de Prospección (Google Places)
  const [selectedCentroide, setSelectedCentroide] = useState<PresetCentroide>(PRESET_CENTROIDES[0]);
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

  // 1.b Estados de Geocodificación Manual, CSV / Scraper y por Lote
  const [modoGeocodificacion, setModoGeocodificacion] = useState<'csv' | 'lote' | 'individual'>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [archivoCsvNombre, setArchivoCsvNombre] = useState<string | null>(null);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [statsImportacion, setStatsImportacion] = useState<{ conGpsScraper: number; geocodificados: number; omitidos: number } | null>(null);
  const [textoLote, setTextoLote] = useState<string>('');
  const [categoriaLote, setCategoriaLote] = useState<GooglePlaceCategory>('store');
  const [isGeocodingLote, setIsGeocodingLote] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{ actual: number; total: number } | null>(null);
  const [geocodedItems, setGeocodedItems] = useState<GeocodedAddressItem[]>([]);
  
  // Individual
  const [indivNombre, setIndivNombre] = useState('');
  const [indivDireccion, setIndivDireccion] = useState('');
  const [indivCategoria, setIndivCategoria] = useState<GooglePlaceCategory>('store');
  const [indivBuscando, setIndivBuscando] = useState(false);
  const [indivResultado, setIndivResultado] = useState<GeocodedAddressItem | null>(null);

  // Búsqueda y Edición en Catálogo Maestro
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [filtroCatCatalogo, setFiltroCatCatalogo] = useState<string>('todas');
  const [comercioEditando, setComercioEditando] = useState<ComercioMaster | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editCategoria, setEditCategoria] = useState<string>('store');
  const [editLat, setEditLat] = useState<number>(-27.7880);
  const [editLng, setEditLng] = useState<number>(-64.2610);
  const [editBuscandoCoordenadas, setEditBuscandoCoordenadas] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null);

  // 1.c Modal de Pre-validación de Puntos de Referencia
  const [modalPrevalidarPuntos, setModalPrevalidarPuntos] = useState(false);
  const [filtroGrupoPuntos, setFiltroGrupoPuntos] = useState<string>('todos');
  const [busquedaPunto, setBusquedaPunto] = useState<string>('');
  const [puntoCopiado, setPuntoCopiado] = useState<string | null>(null);

  const handleCopiarCoordenadas = (lat: number, lng: number, nombre: string) => {
    const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordsStr);
    setPuntoCopiado(nombre);
    setTimeout(() => setPuntoCopiado(null), 2000);
  };

  const handleSeleccionarPuntoPrevalidado = (punto: PresetCentroide) => {
    setSelectedCentroide(punto);
    setCustomLat(punto.lat);
    setCustomLng(punto.lng);
    setModalPrevalidarPuntos(false);
    setFeedbackMsg({
      tipo: 'info',
      texto: `Punto de referencia fijado: "${punto.nombre}" (${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)}).`,
    });
  };

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
  const [tenantActionMsg, setTenantActionMsg] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [assigningTenantId, setAssigningTenantId] = useState<string | null>(null);
  
  // Modal interactivo de asignación de zonas para Tenants
  const [modalAsignarTenant, setModalAsignarTenant] = useState<TenantWithDetails | null>(null);
  const [zonasSeleccionadasModal, setZonasSeleccionadasModal] = useState<string[]>([]);
  const [filtroSectorModal, setFiltroSectorModal] = useState<string>('todos');
  const [nuevaZonaCustom, setNuevaZonaCustom] = useState<string>('');

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
    } else {
      const zonasDef = gridClusteringService.getZonasPreconfiguradasSantiago();
      setComputedZones(zonasDef);
    }
  };

  const loadTenants = async () => {
    const list = await tenantService.getTenants();
    setTenants(list);
  };

  const zonasDisponiblesModal = React.useMemo(() => {
    const base = computedZones.length > 0
      ? computedZones
      : gridClusteringService.getZonasPreconfiguradasSantiago();

    const map = new Map<string, (typeof base)[0]>();
    for (const z of base) {
      map.set(z.codigo_zona, z);
    }
    const defaults = gridClusteringService.getZonasPreconfiguradasSantiago();
    for (const d of defaults) {
      if (!map.has(d.codigo_zona)) {
        map.set(d.codigo_zona, d);
      }
    }
    if (modalAsignarTenant?.zonas_asignadas) {
      for (const code of modalAsignarTenant.zonas_asignadas) {
        if (!map.has(code)) {
          map.set(code, {
            codigo_zona: code,
            sector: code.includes('SUR') ? 'SUR' : code.includes('NORTE') ? 'NORTE' : code.includes('ESTE') ? 'ESTE' : code.includes('OESTE') ? 'OESTE' : 'CENTRO',
            numero_secuencial: 1,
            centroide_lat: -27.7880,
            centroide_lng: -64.2610,
            total_comercios: 20,
            comercios: [],
            radio_estimado_metros: 800,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [computedZones, modalAsignarTenant]);

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

  const handlePurgarErroneos = async () => {
    setIsScanning(true);
    try {
      const res = await googlePlacesService.purgarComerciosErroneos();
      await loadMasterData();
      alert(`Filtro aplicado: ${res.eliminados} comercios fuera del radio de Santiago del Estero fueron eliminados de la base de datos. Se mantienen ${res.restantes} comercios válidos.`);
    } finally {
      setIsScanning(false);
    }
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

  const notificar = (texto: string, tipo: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMsg({ texto, tipo });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleInsertarEjemploLote = () => {
    setTextoLote(`Supermercado Luque, Juncal 510, Supermercado
Autoservicio Belgrano, Av. Belgrano Sur 1400, Autoservicio
Farmacia del Pueblo, 24 de Septiembre 150, Farmacia
Distribuidora San Carlos, Av. Moreno 1100, Comercio
Corralón San José, Av. Solís 450, Casa de Construcción
Minimercado Sarmiento, Sarmiento 180, Almacén
Ferretería El Tornillo, Av. Colón Sur 620, Ferretería
Supermercado Vea, Rivadavia 340, Supermercado`);
  };

  const handleDescargarPlantillaCsv = () => {
    const contenido = `nombre,direccion,categoria,latitud,longitud,telefono
Supermercado Luque,Juncal 510,grocery_or_supermarket,-27.807500,-64.243500,3854123456
Farmacia Belgrano,Av. Belgrano Sur 1400,pharmacy,-27.808000,-64.261000,3854987654
Ferretería Colón,Av. Colón Sur 2100,hardware_store,-27.810500,-64.272500,3854332211
Despensa El Cruce,Av. Solís 450,convenience_store,-27.810600,-64.261100,
Corralón San Martín,Av. Rivadavia 250,construction_store,-27.786200,-64.261200,3854220011`;

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_scraper_comercios_santiago.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notificar('Descargando plantilla CSV de ejemplo.', 'info');
  };

  const leerYProcesarArchivoCsv = (file: File) => {
    setArchivoCsvNombre(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const contenido = event.target?.result as string;
      if (!contenido) return;
      setIsGeocodingLote(true);
      setGeocodedItems([]);
      setGeocodingProgress({ actual: 0, total: 1 });
      setStatsImportacion(null);
      try {
        const res = await googlePlacesService.procesarCsvOTextoScraper(
          contenido,
          categoriaLote,
          (actual, total) => {
            setGeocodingProgress({ actual, total });
          }
        );
        setGeocodedItems(res.items);
        setStatsImportacion({
          conGpsScraper: res.conGpsScraper,
          geocodificados: res.geocodificados,
          omitidos: res.omitidos,
        });
        notificar(
          `Archivo procesado: ${res.items.length} locales identificados (${res.conGpsScraper} con coordenadas satelitales directas, ${res.geocodificados} geocodificados).`,
          'success'
        );
      } catch (err) {
        notificar('Ocurrió un error al procesar el archivo CSV.', 'error');
      } finally {
        setIsGeocodingLote(false);
        setGeocodingProgress(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSubirArchivoCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    leerYProcesarArchivoCsv(file);
  };

  const handleDropCsv = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      leerYProcesarArchivoCsv(e.dataTransfer.files[0]);
    }
  };

  const handleGeocodificarLote = async () => {
    if (!textoLote.trim()) {
      notificar('Ingresa o pega al menos una dirección para geocodificar.', 'info');
      return;
    }

    setIsGeocodingLote(true);
    setGeocodedItems([]);
    setGeocodingProgress({ actual: 0, total: 1 });

    try {
      const res = await googlePlacesService.procesarCsvOTextoScraper(
        textoLote,
        categoriaLote,
        (actual, total) => {
          setGeocodingProgress({ actual, total });
        }
      );
      setGeocodedItems(res.items);
      setStatsImportacion({
        conGpsScraper: res.conGpsScraper,
        geocodificados: res.geocodificados,
        omitidos: res.omitidos,
      });
      notificar(`Procesamiento completado: ${res.items.length} locales identificados (${res.conGpsScraper} con GPS del scraper, ${res.geocodificados} geocodificados).`, 'success');
    } catch (e) {
      notificar('Ocurrió un inconveniente geocodificando las direcciones.', 'error');
    } finally {
      setIsGeocodingLote(false);
      setGeocodingProgress(null);
    }
  };

  const handleGuardarGeocodificados = async () => {
    if (geocodedItems.length === 0) return;
    const res = await googlePlacesService.guardarComerciosGeocodificados(geocodedItems);
    await loadMasterData();
    notificar(`¡Éxito! ${res.agregados} comercios guardados en Catálogo Maestro (${res.yaExistentes} omitidos por duplicidad).`, 'success');
    setGeocodedItems([]);
    setTextoLote('');
  };

  const handleEliminarFilaGeocodificada = (index: number) => {
    setGeocodedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGeocodificarIndividual = async () => {
    if (!indivDireccion.trim()) {
      notificar('Ingresa la dirección física del comercio.', 'info');
      return;
    }
    setIndivBuscando(true);
    try {
      const res = await googlePlacesService.geocodificarDireccionSantiago(
        indivDireccion,
        indivNombre || undefined,
        indivCategoria
      );
      setIndivResultado(res);
      if (res) {
        notificar(`Coordenadas encontradas: Lat ${res.latitud}, Lng ${res.longitud}`, 'success');
      } else {
        notificar('No se pudo encontrar la dirección dentro del radio de Santiago del Estero.', 'error');
      }
    } finally {
      setIndivBuscando(false);
    }
  };

  const handleGuardarIndividual = async () => {
    if (!indivResultado) return;
    const res = await googlePlacesService.guardarComerciosGeocodificados([indivResultado]);
    await loadMasterData();
    if (res.agregados > 0) {
      notificar(`Comercio "${indivResultado.nombre}" agregado con éxito al catálogo maestro.`, 'success');
      setIndivNombre('');
      setIndivDireccion('');
      setIndivResultado(null);
    } else {
      notificar('Este comercio ya se encontraba registrado en el catálogo.', 'info');
    }
  };

  const handleAbrirEditarComercio = (c: ComercioMaster) => {
    setComercioEditando(c);
    setEditNombre(c.nombre);
    setEditDireccion(c.direccion || '');
    setEditCategoria(c.categoria || 'store');
    setEditLat(c.latitud);
    setEditLng(c.longitud);
  };

  const handleRegeocodificarEdicion = async () => {
    if (!editDireccion.trim()) {
      notificar('Ingresa una dirección para calcular sus coordenadas.', 'info');
      return;
    }
    setEditBuscandoCoordenadas(true);
    try {
      const geo = await googlePlacesService.geocodificarDireccionSantiago(
        editDireccion,
        editNombre,
        editCategoria as GooglePlaceCategory
      );
      if (geo) {
        setEditLat(geo.latitud);
        setEditLng(geo.longitud);
        notificar(`Nuevas coordenadas calculadas: Lat ${geo.latitud}, Lng ${geo.longitud}`, 'success');
      }
    } finally {
      setEditBuscandoCoordenadas(false);
    }
  };

  const handleGuardarEdicionComercio = async () => {
    if (!comercioEditando) return;
    const idTarget = comercioEditando.id_comercio || comercioEditando.google_place_id;
    const ok = await googlePlacesService.actualizarComercioMaster(idTarget, {
      nombre: editNombre,
      direccion: editDireccion,
      categoria: editCategoria,
      latitud: editLat,
      longitud: editLng,
    });
    if (ok) {
      await loadMasterData();
      notificar(`Comercio "${editNombre}" actualizado con éxito con sus nuevas coordenadas.`, 'success');
      setComercioEditando(null);
    }
  };

  const handleEliminarComercio = async (c: ComercioMaster) => {
    if (confirm(`¿Deseas eliminar "${c.nombre}" del catálogo maestro?`)) {
      const idTarget = c.id_comercio || c.google_place_id;
      await googlePlacesService.eliminarComercioMaster(idTarget);
      await loadMasterData();
      notificar(`Comercio eliminado del catálogo.`, 'info');
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
      setTenantActionMsg({ tipo: 'success', texto: res.message });
      await loadTenants();
      setTimeout(() => setTenantActionMsg(null), 6000);
    } else {
      setTenantActionMsg({ tipo: 'error', texto: res.message });
    }
  };

  const handleToggleTenant = async (tenantId: string) => {
    const res = await tenantService.toggleTenantStatus(tenantId);
    if (res.success) {
      setTenantActionMsg({ tipo: 'info', texto: res.message });
      await loadTenants();
      setTimeout(() => setTenantActionMsg(null), 4000);
    } else {
      setTenantActionMsg({ tipo: 'error', texto: res.message });
    }
  };

  const handleAsignarZonas = async (tenantId: string, codigos?: string[]) => {
    setAssigningTenantId(tenantId);
    setTenantActionMsg(null);
    const res = await tenantService.asignarZonasGrid(tenantId, codigos);
    setAssigningTenantId(null);
    setTenantActionMsg({
      tipo: res.success ? 'success' : 'error',
      texto: res.message,
    });
    if (res.success) {
      await loadTenants();
    }
    setTimeout(() => setTenantActionMsg(null), 5000);
    return res;
  };

  const handleAbrirModalAsignarZonas = (tenant: TenantWithDetails) => {
    setModalAsignarTenant(tenant);
    const zonasDisp = computedZones.length > 0
      ? computedZones
      : gridClusteringService.getZonasPreconfiguradasSantiago();

    if (tenant.zonas_asignadas && tenant.zonas_asignadas.length > 0) {
      setZonasSeleccionadasModal([...tenant.zonas_asignadas]);
    } else {
      setZonasSeleccionadasModal(zonasDisp.map((z) => z.codigo_zona));
    }
    setFiltroSectorModal('todos');
    setNuevaZonaCustom('');
  };

  const handleToggleZonaModal = (codigo: string) => {
    setZonasSeleccionadasModal((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const handleConfirmarAsignacionModal = async () => {
    if (!modalAsignarTenant) return;
    if (zonasSeleccionadasModal.length === 0) {
      setTenantActionMsg({
        tipo: 'error',
        texto: 'Seleccione al menos una zona para asignar a la distribuidora.',
      });
      return;
    }
    await handleAsignarZonas(modalAsignarTenant.tenant_id, zonasSeleccionadasModal);
    setModalAsignarTenant(null);
  };

  const handleAsignarTodasDirectoModal = async () => {
    if (!modalAsignarTenant) return;
    const zonasDisp = computedZones.length > 0
      ? computedZones
      : gridClusteringService.getZonasPreconfiguradasSantiago();
    const todosCodigos = zonasDisp.map((z) => z.codigo_zona);
    await handleAsignarZonas(modalAsignarTenant.tenant_id, todosCodigos);
    setModalAsignarTenant(null);
  };

  const handleAgregarZonaCustom = () => {
    if (!nuevaZonaCustom.trim()) return;
    const codigoNormalizado = nuevaZonaCustom.trim().toUpperCase();
    if (!zonasSeleccionadasModal.includes(codigoNormalizado)) {
      setZonasSeleccionadasModal((prev) => [...prev, codigoNormalizado]);
    }
    setNuevaZonaCustom('');
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
                    onClick={handlePurgarErroneos}
                    disabled={isScanning}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Restringir y eliminar cualquier comercio fuera del radio de Santiago del Estero"
                  >
                    <Filter className="w-3.5 h-3.5 text-amber-700" />
                    <span>Depurar Fuera de Radio</span>
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
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Ubicación de Referencia
                      </label>
                      <button
                        type="button"
                        onClick={() => setModalPrevalidarPuntos(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Verificar y auditar coordenadas de todas las plazas y cruces"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Pre-validar ({PRESET_CENTROIDES.length})</span>
                      </button>
                    </div>
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
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <optgroup label="🏛️ Plazas y Centros Cívicos">
                        {PRESET_CENTROIDES.filter((p) => p.grupo === 'Plazas y Centros Cívicos').map((p) => (
                          <option key={p.nombre} value={p.nombre}>
                            {p.nombre}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🚦 Cruces de Avenidas Estratégicos">
                        {PRESET_CENTROIDES.filter((p) => p.grupo === 'Cruces de Avenidas Estratégicos').map((p) => (
                          <option key={p.nombre} value={p.nombre}>
                            {p.nombre}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🌉 La Banda y Accesos">
                        {PRESET_CENTROIDES.filter((p) => p.grupo === 'La Banda y Accesos').map((p) => (
                          <option key={p.nombre} value={p.nombre}>
                            {p.nombre}
                          </option>
                        ))}
                      </optgroup>
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
                        title="Latitud"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={customLng}
                        onChange={(e) => setCustomLng(parseFloat(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        title="Longitud"
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

              {/* Accesos Rápidos a Puntos Neurálgicos (Plazas y Cruces de Avenidas) */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    <span>Puntos Rápidos:</span>
                  </span>
                  {[
                    'Plaza Libertad (Centro Cívico)',
                    'Av. Rivadavia & Av. Belgrano',
                    'Av. Colón & Av. Solís',
                    'Av. Belgrano & Av. Solís',
                    'Av. Moreno & Av. Alsina',
                    'Av. Colón & Av. Pedro León Gallo',
                    'Plaza Belgrano (Centro La Banda)',
                  ].map((puntoNombre) => {
                    const puntoObj = PRESET_CENTROIDES.find((p) => p.nombre === puntoNombre);
                    if (!puntoObj) return null;
                    const isActivo = selectedCentroide.nombre === puntoObj.nombre;
                    return (
                      <button
                        key={puntoNombre}
                        type="button"
                        onClick={() => {
                          setSelectedCentroide(puntoObj);
                          setCustomLat(puntoObj.lat);
                          setCustomLng(puntoObj.lng);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          isActivo
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {puntoNombre.replace(' (Centro Cívico)', '').replace(' (Centro La Banda)', ' (La Banda)')}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 rounded-md px-2.5 py-1 flex items-center gap-1.5">
                    <span className="font-semibold text-blue-800">{selectedCentroide.nombre}:</span>
                    <span className="text-slate-600">{selectedCentroide.detalle}</span>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-100 px-1 py-0.2 rounded font-bold">
                      {customLat.toFixed(4)}, {customLng.toFixed(4)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalPrevalidarPuntos(true)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Auditar todos los puntos notables y abrirlos en Google Maps"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Auditar y Pre-validar</span>
                  </button>
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

            {/* Banner de Feedback Operativo */}
            {feedbackMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                  feedbackMsg.tipo === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : feedbackMsg.tipo === 'error'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedbackMsg.tipo === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : feedbackMsg.tipo === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span>{feedbackMsg.texto}</span>
                </div>
                <button
                  onClick={() => setFeedbackMsg(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* PANEL DE GEOCODIFICACIÓN POR DIRECCIÓN (SOLUCIÓN AL DESFASE GEOGRÁFICO) */}
            <div className="bg-white border-2 border-indigo-100 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Geocodificador por Dirección Física (Santiago del Estero & La Banda)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ingresa direcciones reales para calcular sus coordenadas exactas en el radio urbano y corregir los barridos automáticos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setModoGeocodificacion('csv')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      modoGeocodificacion === 'csv'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Subir CSV / Scraper</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoGeocodificacion('lote')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      modoGeocodificacion === 'lote'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pegar Lista / Texto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoGeocodificacion('individual')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      modoGeocodificacion === 'individual'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Alta Individual</span>
                  </button>
                </div>
              </div>

              {/* MODO A: SUBIR ARCHIVO CSV / SCRAPER */}
              {modoGeocodificacion === 'csv' && (
                <div className="space-y-4">
                  {/* Zona Drag & Drop */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingCsv(true);
                    }}
                    onDragLeave={() => setIsDraggingCsv(false)}
                    onDrop={handleDropCsv}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                      isDraggingCsv
                        ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99]'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleSubirArchivoCsv}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">
                          {archivoCsvNombre ? `Archivo cargado: ${archivoCsvNombre}` : 'Arrastra aquí tu archivo CSV o haz clic para seleccionarlo'}
                        </p>
                        <p className="text-xs text-slate-500 max-w-lg mx-auto">
                          Compatible con exportaciones de Google Maps Scrapers (Outscraper, Apify, Octoparse, Instant Data Scraper, Sheets o Excel).
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors pointer-events-none"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{archivoCsvNombre ? 'Cambiar archivo CSV' : 'Seleccionar Archivo CSV'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDescargarPlantillaCsv();
                          }}
                          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar Plantilla CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Explicación Scrapers & Coordenadas */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3.5 text-xs text-indigo-950 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-indigo-900">¿Cómo procesa tus datos el importador inteligente?</p>
                      <p className="text-indigo-800 leading-relaxed">
                        • <strong>Con Coordenadas del Scraper:</strong> Si tu CSV ya contiene columnas de GPS (como <code>latitude, longitude, lat, lng</code>), se toman directamente con <strong>100% de precisión satelital</strong>.<br />
                        • <strong>Sin Coordenadas GPS:</strong> Si tu archivo solo contiene direcciones físicas (ej. <code>"Juncal 510", "Av. Belgrano Sur 1400"</code>), el geocodificador nativo busca su ubicación exacta dentro de Santiago del Estero y La Banda.
                      </p>
                    </div>
                  </div>

                  {/* Rubro por defecto si falta en el archivo */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Rubro por defecto (si la fila no especifica uno):</span>
                      <select
                        value={categoriaLote}
                        onChange={(e) => setCategoriaLote(e.target.value as GooglePlaceCategory)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
                      >
                        {CATEGORIAS_CONFIG.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Estadísticas de la importación */}
                  {statsImportacion && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="text-[11px] font-semibold text-emerald-800">Con Coordenadas GPS del Scraper</div>
                        <div className="text-xl font-bold text-emerald-700">{statsImportacion.conGpsScraper}</div>
                        <p className="text-[10px] text-emerald-600 font-medium">100% precisión satelital directa</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-[11px] font-semibold text-blue-800">Geocodificados por Dirección</div>
                        <div className="text-xl font-bold text-blue-700">{statsImportacion.geocodificados}</div>
                        <p className="text-[10px] text-blue-600 font-medium">Ubicados en radio Santiago / La Banda</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-[11px] font-semibold text-slate-700">Omitidos / Inválidos</div>
                        <div className="text-xl font-bold text-slate-600">{statsImportacion.omitidos}</div>
                        <p className="text-[10px] text-slate-500 font-medium">Filas sin nombre o vacías</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODO B: CARGA POR LOTE */}
              {modoGeocodificacion === 'lote' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <label className="font-semibold text-slate-700">
                      Pega aquí tu lista de comercios y direcciones (una por línea):
                    </label>
                    <button
                      type="button"
                      onClick={handleInsertarEjemploLote}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline self-start sm:self-auto cursor-pointer"
                    >
                      Cargar 8 direcciones de ejemplo de Santiago
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={5}
                      value={textoLote}
                      onChange={(e) => setTextoLote(e.target.value)}
                      placeholder={`Pega aquí texto separado por comas, punto y coma, tabulaciones o formato CSV completo:
Supermercado Luque, Juncal 510, Supermercado
Autoservicio Belgrano, Av. Belgrano Sur 1400, Autoservicio
Farmacia Central, 24 de Septiembre 150, Farmacia
Ferretería Colón, Av. Colón Sur 2100, Ferretería, -27.8105, -64.2725
Corralón Solís, Av. Solís 450, Casa de Construcción`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Rubro por defecto:</span>
                      <select
                        value={categoriaLote}
                        onChange={(e) => setCategoriaLote(e.target.value as GooglePlaceCategory)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                      >
                        {CATEGORIAS_CONFIG.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleGeocodificarLote}
                      disabled={isGeocodingLote || !textoLote.trim()}
                      className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeocodingLote ? 'animate-spin' : ''}`} />
                      <span>{isGeocodingLote ? 'Procesando...' : '🔍 Procesar y Geocodificar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Progreso de la geocodificación (común a CSV y Lote) */}
              {(modoGeocodificacion === 'csv' || modoGeocodificacion === 'lote') && isGeocodingLote && geocodingProgress && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-indigo-900">
                    <span>Procesando direcciones en Santiago del Estero...</span>
                    <span>{geocodingProgress.actual} de {geocodingProgress.total}</span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 transition-all duration-300"
                      style={{
                        width: `${Math.round((geocodingProgress.actual / Math.max(geocodingProgress.total, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Resultados del Lote Geocodificado (común a CSV y Lote) */}
              {(modoGeocodificacion === 'csv' || modoGeocodificacion === 'lote') && geocodedItems.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden space-y-0">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {geocodedItems.length} Comercios Listos para Catálogo Maestro
                      </span>
                      {archivoCsvNombre && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono">
                          {archivoCsvNombre}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleGuardarGeocodificados}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Todos en Catálogo Maestro</span>
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {geocodedItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">{item.nombre}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {getCategoryLabel(item.categoria)}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              item.precision === 'gps_scraper'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : item.precision === 'exacta'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {item.precision === 'gps_scraper'
                                ? '🛰️ GPS Scraper (100%)'
                                : item.precision === 'exacta'
                                ? '📍 Exacta'
                                : '〰️ Aprox. Arteria'}
                            </span>
                            {item.origen && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {item.origen === 'scraper_csv' ? 'Origen: CSV Scraper' : item.origen === 'manual' ? 'Origen: Manual' : 'Origen: Geocodificado'}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px] flex flex-wrap items-center gap-3">
                            <span>📍 {item.direccion}</span>
                            {item.telefono && (
                              <span className="text-slate-600 font-sans">📞 {item.telefono}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Lat: {item.latitud.toFixed(6)} | Lng: {item.longitud.toFixed(6)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleEliminarFilaGeocodificada(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 self-end sm:self-center transition-colors cursor-pointer"
                          title="Descartar de la lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MODO B: ALTA INDIVIDUAL CON GEOCODER */}
              {modoGeocodificacion === 'individual' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Nombre del Comercio
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Supermercado Vea Juncal"
                        value={indivNombre}
                        onChange={(e) => setIndivNombre(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Dirección en Santiago del Estero / La Banda
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Juncal 510 o Av. Belgrano Sur 1450"
                        value={indivDireccion}
                        onChange={(e) => setIndivDireccion(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Rubro Comercial
                      </label>
                      <select
                        value={indivCategoria}
                        onChange={(e) => setIndivCategoria(e.target.value as GooglePlaceCategory)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      >
                        {CATEGORIAS_CONFIG.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleGeocodificarIndividual}
                      disabled={indivBuscando || !indivDireccion.trim()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Search className={`w-3.5 h-3.5 ${indivBuscando ? 'animate-spin' : ''}`} />
                      <span>{indivBuscando ? 'Localizando...' : 'Localizar Coordenadas'}</span>
                    </button>
                  </div>

                  {indivResultado && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-950">{indivResultado.nombre}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                            {indivResultado.precision === 'exacta' ? 'Ubicación Exacta' : 'Arteria / Cuadra'}
                          </span>
                        </div>
                        <p className="text-emerald-800 font-mono text-[11px]">
                          📍 {indivResultado.direccion}
                        </p>
                        <p className="text-emerald-700 font-mono text-[10px]">
                          Latitud: {indivResultado.latitud} | Longitud: {indivResultado.longitud}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleGuardarIndividual}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Guardar en Catálogo Maestro</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Catálogo Maestro Actual con Buscador y Corrección Rápida */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Comercios en Catálogo Maestro ({masterComercios.length})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Radio Santiago del Estero Estricto
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Restringido a Santiago del Estero y La Banda. Corrige coordenadas de comercios desfasados o agrégalos directamente.
                  </p>
                </div>
                <button
                  onClick={handlePurgarErroneos}
                  disabled={isScanning}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  title="Auditar y eliminar comercios erróneos fuera del radio"
                >
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Depurar Erróneos</span>
                </button>
              </div>

              {/* Barra de Filtros del Catálogo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o dirección..."
                    value={busquedaCatalogo}
                    onChange={(e) => setBusquedaCatalogo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <select
                    value={filtroCatCatalogo}
                    onChange={(e) => setFiltroCatCatalogo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="todas">Todos los rubros</option>
                    {CATEGORIAS_CONFIG.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {masterComercios.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No hay comercios indexados. Ejecuta un sondeo, pega tus direcciones arriba o carga el padrón de muestra.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {masterComercios
                    .filter((c) => {
                      const matchTexto =
                        !busquedaCatalogo.trim() ||
                        c.nombre.toLowerCase().includes(busquedaCatalogo.toLowerCase()) ||
                        (c.direccion && c.direccion.toLowerCase().includes(busquedaCatalogo.toLowerCase())) ||
                        c.google_place_id.toLowerCase().includes(busquedaCatalogo.toLowerCase());
                      const matchCat =
                        filtroCatCatalogo === 'todas' || c.categoria === filtroCatCatalogo;
                      return matchTexto && matchCat;
                    })
                    .map((c) => (
                      <div
                        key={c.id_comercio || c.id_comercio_master || c.google_place_id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {c.nombre}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold shrink-0">
                              {getCategoryLabel(c.categoria)}
                            </span>
                          </div>

                          {c.direccion && (
                            <div className="mt-1 text-[11px] text-slate-600 flex items-center gap-1 font-sans">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{c.direccion}</span>
                            </div>
                          )}

                          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                            <span>Lat: {Number(c.latitud).toFixed(4)}</span>
                            <span>Lng: {Number(c.longitud).toFixed(4)}</span>
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
                            ID: {c.google_place_id}
                          </div>
                        </div>

                        {/* Botones de acción individual: Corregir o Eliminar */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleAbrirEditarComercio(c)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Corregir Coordenadas</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarComercio(c)}
                            className="text-xs text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                            title="Eliminar comercio erróneo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* MODAL DE CORRECCIÓN DE COORDENADAS / DIRECCIÓN DE UN COMERCIO */}
            {comercioEditando && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Corregir Ubicación y Datos del Comercio
                      </h4>
                    </div>
                    <button
                      onClick={() => setComercioEditando(null)}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Nombre del Comercio
                      </label>
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Dirección Física (Santiago del Estero / La Banda)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editDireccion}
                          onChange={(e) => setEditDireccion(e.target.value)}
                          placeholder="Ej. Juncal 510 o Av. Belgrano Sur 1400"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="button"
                          onClick={handleRegeocodificarEdicion}
                          disabled={editBuscandoCoordenadas || !editDireccion.trim()}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Calcular latitud y longitud a partir de esta dirección"
                        >
                          <RefreshCw className={`w-3 h-3 ${editBuscandoCoordenadas ? 'animate-spin' : ''}`} />
                          <span>Re-geocodificar</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Latitud Exacta
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={editLat}
                          onChange={(e) => setEditLat(parseFloat(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Longitud Exacta
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={editLng}
                          onChange={(e) => setEditLng(parseFloat(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Rubro / Categoría
                      </label>
                      <select
                        value={editCategoria}
                        onChange={(e) => setEditCategoria(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      >
                        {CATEGORIAS_CONFIG.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setComercioEditando(null)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleGuardarEdicionComercio}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Guardar Coordenadas Corregidas
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DE PRE-VALIDACIÓN DE PUNTOS DE REFERENCIA */}
            {modalPrevalidarPuntos && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in">
                  {/* Cabecera */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Pre-validación de Puntos Estratégicos</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            {PRESET_CENTROIDES.length} Puntos Notables
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Revisa y corrobora la posición satelital de plazas y cruces clave antes de efectuar barridos.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalPrevalidarPuntos(false)}
                      className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Barra de Filtros y Búsqueda */}
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white">
                    <div className="flex flex-wrap gap-1.5">
                      {['todos', 'Plazas y Centros Cívicos', 'Cruces de Avenidas Estratégicos', 'La Banda y Accesos'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFiltroGrupoPuntos(g)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            filtroGrupoPuntos === g
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {g === 'todos' ? 'Todos los Puntos' : g}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por plaza o avenida..."
                        value={busquedaPunto}
                        onChange={(e) => setBusquedaPunto(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Lista de Puntos */}
                  <div className="p-6 overflow-y-auto space-y-3 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PRESET_CENTROIDES
                        .filter((p) => {
                          const matchGrupo = filtroGrupoPuntos === 'todos' || p.grupo === filtroGrupoPuntos;
                          const matchText = !busquedaPunto.trim() || 
                            p.nombre.toLowerCase().includes(busquedaPunto.toLowerCase()) || 
                            p.detalle.toLowerCase().includes(busquedaPunto.toLowerCase());
                          return matchGrupo && matchText;
                        })
                        .map((p) => {
                          const isActivo = selectedCentroide.nombre === p.nombre;
                          const esCopiado = puntoCopiado === p.nombre;
                          return (
                            <div
                              key={p.nombre}
                              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                                isActivo
                                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-300'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-900">{p.nombre}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                                    {p.grupo.replace(' Estratégicos', '')}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">{p.detalle}</p>
                              </div>

                              <div className="pt-2 border-t border-slate-100 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                  <span>{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopiarCoordenadas(p.lat, p.lng, p.nombre)}
                                    className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                    title="Copiar coordenadas"
                                  >
                                    {esCopiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                                    title="Comprobar en Google Maps"
                                  >
                                    <ExternalLink className="w-3 h-3 text-slate-500" />
                                    <span>Ver en Google Maps</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleSeleccionarPuntoPrevalidado(p)}
                                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                      isActivo
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                  >
                                    {isActivo ? 'Seleccionado' : 'Fijar para Sondeo'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Pie del modal con simulación de radio */}
                  <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Radio actual de barrido: <strong className="text-slate-900">{(radioMetros / 1000).toFixed(1)} km</strong> (~{((Math.PI * Math.pow(radioMetros / 1000, 2))).toFixed(1)} km² de cobertura por sondeo).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalPrevalidarPuntos(false)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer self-end sm:self-auto"
                    >
                      Cerrar Validador
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              <div
                className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
                  tenantActionMsg.tipo === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : tenantActionMsg.tipo === 'info'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {tenantActionMsg.tipo === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span className="font-medium">{tenantActionMsg.texto}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTenantActionMsg(null)}
                  className="p-1 hover:opacity-75 cursor-pointer text-slate-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
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
                        type="button"
                        onClick={() => handleAbrirModalAsignarZonas(t)}
                        disabled={assigningTenantId === t.tenant_id}
                        className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                        title="Abrir selector interactivo de zonas para esta distribuidora"
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        <span>
                          {assigningTenantId === t.tenant_id
                            ? 'Asignando...'
                            : t.total_zonas && t.total_zonas > 0
                            ? `Gestionar Zonas (${t.total_zonas})`
                            : 'Asignar Zonas'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleTenant(t.tenant_id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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

            {/* Modal Interactivo de Asignación de Zonas */}
            {modalAsignarTenant && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                  {/* Header del Modal */}
                  <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <Grid3X3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Asignar Zonas Territoriales
                        </h3>
                        <p className="text-xs text-slate-500">
                          Distribuidora: <strong className="text-slate-800">{modalAsignarTenant.nombre_empresa}</strong> • Supervisor: <strong className="text-slate-800">{modalAsignarTenant.supervisor_email}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalAsignarTenant(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Barra de control y filtros */}
                  <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">
                        {zonasSeleccionadasModal.length} de {zonasDisponiblesModal.length} zonas seleccionadas
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZonasSeleccionadasModal(zonasDisponiblesModal.map((z) => z.codigo_zona))}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
                      >
                        Seleccionar Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setZonasSeleccionadasModal([])}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
                      >
                        Deseleccionar
                      </button>
                      <div className="h-4 w-px bg-slate-200 mx-1" />
                      {/* Filtros por sector */}
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        {['todos', 'CENTRO', 'SUR', 'NORTE', 'ESTE', 'OESTE'].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setFiltroSectorModal(sec)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                              filtroSectorModal === sec
                                ? 'bg-white text-blue-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {sec}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo scrollable con tarjetas de zonas */}
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {zonasDisponiblesModal
                        .filter((z) => filtroSectorModal === 'todos' || z.sector.toUpperCase() === filtroSectorModal.toUpperCase())
                        .map((z) => {
                          const isChecked = zonasSeleccionadasModal.includes(z.codigo_zona);
                          return (
                            <div
                              key={z.codigo_zona}
                              onClick={() => handleToggleZonaModal(z.codigo_zona)}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-2 ${
                                isChecked
                                  ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/30'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {z.codigo_zona}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    z.sector === 'CENTRO'
                                      ? 'bg-blue-100 text-blue-800'
                                      : z.sector === 'SUR'
                                      ? 'bg-amber-100 text-amber-800'
                                      : z.sector === 'NORTE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : z.sector === 'ESTE'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {z.sector}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                                <span className="text-[11px]">
                                  {z.total_comercios || 20} comercios auditados
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Agregar zona manual */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">¿Deseas agregar una zona personalizada?</span>
                      <input
                        type="text"
                        placeholder="Ej: SUR-03 o BANDA-02"
                        value={nuevaZonaCustom}
                        onChange={(e) => setNuevaZonaCustom(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAgregarZonaCustom();
                          }
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 uppercase font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarZonaCustom}
                        disabled={!nuevaZonaCustom.trim()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>

                  {/* Footer con acciones */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleAsignarTodasDirectoModal}
                      disabled={assigningTenantId === modalAsignarTenant.tenant_id}
                      className="px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Asignar Todas ({zonasDisponiblesModal.length}) Automáticamente</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalAsignarTenant(null)}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmarAsignacionModal}
                        disabled={assigningTenantId === modalAsignarTenant.tenant_id}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {assigningTenantId === modalAsignarTenant.tenant_id
                            ? 'Asignando...'
                            : `Guardar y Confirmar (${zonasSeleccionadasModal.length} Zonas)`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
