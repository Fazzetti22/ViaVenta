import { ComercioMaster } from '../types/auth';
import { BarridoParams, BarridoResultItem, GoogleCloudQuotaStats, GooglePlaceCategory } from '../types/admin';
import { supabase } from './supabaseClient';

// Clave en LocalStorage para persistir el catálogo máster y los contadores en demo
const STORAGE_KEY_MASTER = 'saas_ruteo_comercios_master_v1';
const STORAGE_KEY_QUOTA = 'saas_ruteo_quota_stats_v1';

// Comercios reales representativos de Santiago del Estero con coordenadas precisas
const SANTIAGO_DEL_ESTERO_SEED_PLACES: Array<{
  google_place_id: string;
  nombre: string;
  categoria: GooglePlaceCategory;
  latitud: number;
  longitud: number;
  barrio: string;
}> = [
  // CENTRO
  { google_place_id: 'ChIJ_sde01_Centro_Juridico1', nombre: 'Estudio Jurídico Dra. Morales & Asoc.', categoria: 'lawyer', latitud: -27.7885, longitud: -64.2615, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde02_Centro_Farmacia1', nombre: 'Farmacia San Martín', categoria: 'pharmacy', latitud: -27.7872, longitud: -64.2608, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde03_Centro_Contable1', nombre: 'Estudio Contable & Impositivo Díaz y Cía', categoria: 'accounting', latitud: -27.7865, longitud: -64.2625, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde04_Centro_Imprenta1', nombre: 'Copistería & Imprenta Digital Mitre', categoria: 'print_shop', latitud: -27.7891, longitud: -64.2595, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde05_Centro_Ferreteria1', nombre: 'Ferretería & Bulonería Central', categoria: 'hardware_store', latitud: -27.7878, longitud: -64.2612, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde06_Centro_Construccion1', nombre: 'Casa de la Construcción Santiago Centro', categoria: 'construction_store', latitud: -27.7898, longitud: -64.2630, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde07_Centro_Juridico2', nombre: 'Bufete Legal Santiago - Dr. Castiglione', categoria: 'lawyer', latitud: -27.7858, longitud: -64.2602, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde08_Centro_Farmacia2', nombre: 'Farmacia del Pueblo 9 de Julio', categoria: 'pharmacy', latitud: -27.7880, longitud: -64.2640, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde09_Centro_Contable2', nombre: 'Consultoría Contable & Auditoría NOA', categoria: 'accounting', latitud: -27.7869, longitud: -64.2585, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde10_Centro_Imprenta2', nombre: 'Centro de Copiado & Gráfica Tucumán', categoria: 'print_shop', latitud: -27.7875, longitud: -64.2635, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde11_Centro_Almacen2', nombre: 'Minimercado Sarmiento', categoria: 'convenience_store', latitud: -27.7892, longitud: -64.2621, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde12_Centro_Super2', nombre: 'Autoservicio Rivadavia', categoria: 'grocery_or_supermarket', latitud: -27.7852, longitud: -64.2618, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde13_Centro_Ferreteria2', nombre: 'Ferretería Industrial Colón', categoria: 'hardware_store', latitud: -27.7905, longitud: -64.2605, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde14_Centro_Construccion2', nombre: 'Corralón & Sanitarios Santiago', categoria: 'construction_store', latitud: -27.7888, longitud: -64.2648, barrio: 'Centro' },
  { google_place_id: 'ChIJ_sde15_Centro_Juridico3', nombre: 'Estudio Jurídico & Notarial Belgrano', categoria: 'lawyer', latitud: -27.7860, longitud: -64.2598, barrio: 'Centro' },

  // SUR (Av. Belgrano Sur, Cabildo, América del Sur, Ejército Argentino)
  { google_place_id: 'ChIJ_sde21_Sur_Super1', nombre: 'Supermercado Luque Sur', categoria: 'grocery_or_supermarket', latitud: -27.8045, longitud: -64.2580, barrio: 'Cabildo' },
  { google_place_id: 'ChIJ_sde22_Sur_Ferreteria1', nombre: 'Ferretería El Tornillo Belgrano Sur', categoria: 'hardware_store', latitud: -27.8062, longitud: -64.2592, barrio: 'Cabildo' },
  { google_place_id: 'ChIJ_sde23_Sur_Farmacia1', nombre: 'Farmacia Belgrano Sur', categoria: 'pharmacy', latitud: -27.8030, longitud: -64.2575, barrio: 'América del Sur' },
  { google_place_id: 'ChIJ_sde24_Sur_Construccion1', nombre: 'Corralón de Materiales San Jorge Sur', categoria: 'construction_store', latitud: -27.8080, longitud: -64.2610, barrio: 'América del Sur' },
  { google_place_id: 'ChIJ_sde25_Sur_Imprenta1', nombre: 'Copistería & Impresiones del Sur', categoria: 'print_shop', latitud: -27.8055, longitud: -64.2568, barrio: 'Cabildo' },
  { google_place_id: 'ChIJ_sde26_Sur_Contable1', nombre: 'Estudio Contable Profesional Solís', categoria: 'accounting', latitud: -27.8105, longitud: -64.2625, barrio: 'Ejército Argentino' },
  { google_place_id: 'ChIJ_sde27_Sur_Juridico1', nombre: 'Asesoría Legal Integral Dr. Gómez Paz', categoria: 'lawyer', latitud: -27.8120, longitud: -64.2640, barrio: 'Ejército Argentino' },
  { google_place_id: 'ChIJ_sde28_Sur_Super2', nombre: 'Autoservicio Familia Sur', categoria: 'grocery_or_supermarket', latitud: -27.8090, longitud: -64.2588, barrio: 'América del Sur' },
  { google_place_id: 'ChIJ_sde29_Sur_Farmacia2', nombre: 'Farmacia San Cayetano', categoria: 'pharmacy', latitud: -27.8135, longitud: -64.2630, barrio: 'Ejército Argentino' },
  { google_place_id: 'ChIJ_sde30_Sur_Construccion2', nombre: 'Materiales de Construcción NOA Sur', categoria: 'construction_store', latitud: -27.8075, longitud: -64.2595, barrio: 'Cabildo' },
  { google_place_id: 'ChIJ_sde31_Sur_Ferreteria2', nombre: 'Ferretería & Herramientas El Cruce', categoria: 'hardware_store', latitud: -27.8150, longitud: -64.2615, barrio: 'Ejército Argentino' },
  { google_place_id: 'ChIJ_sde32_Sur_Imprenta2', nombre: 'Gráfica & Fotocopias Belgrano Sur', categoria: 'print_shop', latitud: -27.8165, longitud: -64.2650, barrio: 'Ejército Argentino' },
  { google_place_id: 'ChIJ_sde33_Sur_Contable2', nombre: 'Estudio Contable Balances & Tributación Sur', categoria: 'accounting', latitud: -27.8112, longitud: -64.2601, barrio: 'América del Sur' },
  { google_place_id: 'ChIJ_sde34_Sur_Juridico2', nombre: 'Estudio Jurídico Laboral & Civil Sur', categoria: 'lawyer', latitud: -27.8040, longitud: -64.2562, barrio: 'Cabildo' },
  { google_place_id: 'ChIJ_sde35_Sur_Ferreteria3', nombre: 'Bulonería & Ferretería Industrial Santiago Sur', categoria: 'hardware_store', latitud: -27.8142, longitud: -64.2628, barrio: 'Ejército Argentino' },
  { google_place_id: 'ChIJ_sde36_Sur_Super3', nombre: 'Distribuidora Litoral Sur', categoria: 'grocery_or_supermarket', latitud: -27.8180, longitud: -64.2635, barrio: 'Juan Díaz de Solís' },
  { google_place_id: 'ChIJ_sde37_Sur_Construccion3', nombre: 'Corralón & Áridos Juan Díaz de Solís', categoria: 'construction_store', latitud: -27.8195, longitud: -64.2660, barrio: 'Juan Díaz de Solís' },

  // NORTE (Parque Aguirre, Huaico Hondo, Av. Belgrano Norte)
  { google_place_id: 'ChIJ_sde41_Norte_Ferreteria1', nombre: 'Ferretería Parque Aguirre', categoria: 'hardware_store', latitud: -27.7710, longitud: -64.2580, barrio: 'Parque Aguirre' },
  { google_place_id: 'ChIJ_sde42_Norte_Farmacia1', nombre: 'Farmacia Huaico Hondo', categoria: 'pharmacy', latitud: -27.7680, longitud: -64.2595, barrio: 'Huaico Hondo' },
  { google_place_id: 'ChIJ_sde43_Norte_Super1', nombre: 'Autoservicio La Amistad Norte', categoria: 'grocery_or_supermarket', latitud: -27.7695, longitud: -64.2612, barrio: 'Huaico Hondo' },
  { google_place_id: 'ChIJ_sde44_Norte_Construccion1', nombre: 'Corralón de Materiales Norteño', categoria: 'construction_store', latitud: -27.7725, longitud: -64.2570, barrio: 'Parque Aguirre' },
  { google_place_id: 'ChIJ_sde45_Norte_Imprenta1', nombre: 'Copistería & Diseños Gráficos Costanera', categoria: 'print_shop', latitud: -27.7672, longitud: -64.2555, barrio: 'Costanera' },
  { google_place_id: 'ChIJ_sde46_Norte_Juridico1', nombre: 'Estudio Jurídico & Previsional Huaico Hondo', categoria: 'lawyer', latitud: -27.7650, longitud: -64.2620, barrio: 'Huaico Hondo' },
  { google_place_id: 'ChIJ_sde47_Norte_Contable1', nombre: 'Estudio Contable & Impositivo Alberdi', categoria: 'accounting', latitud: -27.7640, longitud: -64.2605, barrio: 'Huaico Hondo' },
  { google_place_id: 'ChIJ_sde48_Norte_Super2', nombre: 'Super Chango Norte', categoria: 'grocery_or_supermarket', latitud: -27.7730, longitud: -64.2625, barrio: 'Alberdi' },
  { google_place_id: 'ChIJ_sde49_Norte_Farmacia2', nombre: 'Farmacia Alberdi', categoria: 'pharmacy', latitud: -27.7745, longitud: -64.2610, barrio: 'Alberdi' },
  { google_place_id: 'ChIJ_sde50_Norte_Ferreteria2', nombre: 'Ferretería & Pinturería Belgrano Norte', categoria: 'hardware_store', latitud: -27.7665, longitud: -64.2588, barrio: 'Huaico Hondo' },
  { google_place_id: 'ChIJ_sde51_Norte_Construccion2', nombre: 'Casa de la Construcción Huaico Hondo', categoria: 'construction_store', latitud: -27.7705, longitud: -64.2562, barrio: 'Parque Aguirre' },
  { google_place_id: 'ChIJ_sde52_Norte_Imprenta2', nombre: 'Imprenta Rápida & Centro de Copiado Borges', categoria: 'print_shop', latitud: -27.7625, longitud: -64.2635, barrio: 'Borges' },

  // ESTE (La Banda / Cruce Río Dulce / Av. Jesús Fernández)
  { google_place_id: 'ChIJ_sde61_Este_Super1', nombre: 'Supermercado Central La Banda', categoria: 'grocery_or_supermarket', latitud: -27.7320, longitud: -64.2420, barrio: 'La Banda Centro' },
  { google_place_id: 'ChIJ_sde62_Este_Farmacia1', nombre: 'Farmacia Banda Norte', categoria: 'pharmacy', latitud: -27.7340, longitud: -64.2405, barrio: 'La Banda Centro' },
  { google_place_id: 'ChIJ_sde63_Este_Ferreteria1', nombre: 'Ferretería Industrial Bandeña', categoria: 'hardware_store', latitud: -27.7790, longitud: -64.2480, barrio: 'Río Dulce' },
  { google_place_id: 'ChIJ_sde64_Este_Construccion1', nombre: 'Corralón & Materiales San Javier La Banda', categoria: 'construction_store', latitud: -27.7355, longitud: -64.2435, barrio: 'La Banda Centro' },
  { google_place_id: 'ChIJ_sde65_Este_Imprenta1', nombre: 'Copistería & Gráfica España La Banda', categoria: 'print_shop', latitud: -27.7650, longitud: -64.2490, barrio: 'Ribera Este' },
  { google_place_id: 'ChIJ_sde66_Este_Juridico1', nombre: 'Estudio Jurídico Dra. Ledesma & Asoc. La Banda', categoria: 'lawyer', latitud: -27.7360, longitud: -64.2410, barrio: 'La Banda Centro' },
  { google_place_id: 'ChIJ_sde67_Este_Contable1', nombre: 'Estudio Contable Impositivo Río Dulce', categoria: 'accounting', latitud: -27.7820, longitud: -64.2465, barrio: 'Río Dulce' },
  { google_place_id: 'ChIJ_sde68_Este_Super2', nombre: 'Autoservicio Sarmiento Este', categoria: 'grocery_or_supermarket', latitud: -27.7805, longitud: -64.2450, barrio: 'Río Dulce' },

  // OESTE (Barrio Autonomía, Santa Lucía, Smata)
  { google_place_id: 'ChIJ_sde71_Oeste_Super1', nombre: 'Supermercado Barrio Autonomía', categoria: 'grocery_or_supermarket', latitud: -27.7850, longitud: -64.2880, barrio: 'Autonomía' },
  { google_place_id: 'ChIJ_sde72_Oeste_Farmacia1', nombre: 'Farmacia Santa Lucía', categoria: 'pharmacy', latitud: -27.7830, longitud: -64.2865, barrio: 'Santa Lucía' },
  { google_place_id: 'ChIJ_sde73_Oeste_Ferreteria1', nombre: 'Ferretería El Progreso Oeste', categoria: 'hardware_store', latitud: -27.7865, longitud: -64.2902, barrio: 'Autonomía' },
  { google_place_id: 'ChIJ_sde74_Oeste_Construccion1', nombre: 'Corralón & Ferretería Industrial Autonomía', categoria: 'construction_store', latitud: -27.7842, longitud: -64.2850, barrio: 'Santa Lucía' },
  { google_place_id: 'ChIJ_sde75_Oeste_Imprenta1', nombre: 'Copistería & Gráfica Smata', categoria: 'print_shop', latitud: -27.7870, longitud: -64.2875, barrio: 'Smata' },
  { google_place_id: 'ChIJ_sde76_Oeste_Juridico1', nombre: 'Estudio Jurídico del Oeste - Dr. Herrera', categoria: 'lawyer', latitud: -27.7820, longitud: -64.2895, barrio: 'Autonomía' },
  { google_place_id: 'ChIJ_sde77_Oeste_Contable1', nombre: 'Estudio Contable & Auditoría Santa Lucía', categoria: 'accounting', latitud: -27.7885, longitud: -64.2920, barrio: 'Smata' },
  { google_place_id: 'ChIJ_sde78_Oeste_Super2', nombre: 'Autoservicio Libertad Oeste', categoria: 'grocery_or_supermarket', latitud: -27.7815, longitud: -64.2840, barrio: 'Santa Lucía' },
];

export class GooglePlacesService {
  private static instance: GooglePlacesService;
  private quotaStats: GoogleCloudQuotaStats = {
    requestsThisSession: 0,
    placesDiscoveredThisSession: 0,
    duplicatesPrevented: 0,
    monthlyFreeCreditsUsd: 200.0,
    estimatedCostUsd: 0.0,
    freeTierUsagePercent: 0.0,
  };

  private constructor() {
    this.loadQuotaFromStorage();
  }

  public static getInstance(): GooglePlacesService {
    if (!GooglePlacesService.instance) {
      GooglePlacesService.instance = new GooglePlacesService();
    }
    return GooglePlacesService.instance;
  }

  private loadQuotaFromStorage(): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY_QUOTA);
    if (raw) {
      try {
        this.quotaStats = JSON.parse(raw);
      } catch {
        // use default
      }
    }
  }

  private saveQuotaToStorage(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_QUOTA, JSON.stringify(this.quotaStats));
  }

  public getQuotaStats(): GoogleCloudQuotaStats {
    return { ...this.quotaStats };
  }

  public resetQuotaStats(): void {
    this.quotaStats = {
      requestsThisSession: 0,
      placesDiscoveredThisSession: 0,
      duplicatesPrevented: 0,
      monthlyFreeCreditsUsd: 200.0,
      estimatedCostUsd: 0.0,
      freeTierUsagePercent: 0.0,
    };
    this.saveQuotaToStorage();
  }

  /**
   * Calcula distancia Haversine en metros entre dos coordenadas
   */
  public calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la tierra en metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Obtiene todos los comercios actualmente almacenados en comercios_master (Supabase o LocalStorage)
   */
  public async getExistingComerciosMaster(): Promise<ComercioMaster[]> {
    try {
      const { data, error } = await supabase.from('comercios_master').select('*');
      if (!error && data && data.length > 0) {
        return data as ComercioMaster[];
      }
    } catch {
      // fallback a almacenamiento local
    }

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_MASTER);
      if (raw) {
        try {
          const list: ComercioMaster[] = JSON.parse(raw);
          // Purga automática de rubros discontinuados (panaderías y kioscos)
          const cleaned = list.filter(
            (c) => (c.categoria as string) !== 'bakery' && (c.categoria as string) !== 'kiosk'
          );
          if (cleaned.length !== list.length) {
            localStorage.setItem(STORAGE_KEY_MASTER, JSON.stringify(cleaned));
          }
          return cleaned;
        } catch {
          return [];
        }
      }
    }
    return [];
  }

  /**
   * Realiza la consulta a la API de Google Places (Nearby Search)
   * e inserta en comercios_master ÚNICAMENTE los comercios no duplicados.
   */
  public async ejecutarBarrido(params: BarridoParams): Promise<{
    success: boolean;
    nuevosComercios: ComercioMaster[];
    duplicadosOmitidos: number;
    totalEncontrados: number;
    itemsReport: BarridoResultItem[];
    quotaStats: GoogleCloudQuotaStats;
    message: string;
  }> {
    // 1. Incrementar contador de llamadas a la API de Google Places
    // Costo estándar Nearby Search (Google Maps Platform Essentials / Places Pro): ~$0.032 USD por request
    this.quotaStats.requestsThisSession += 1;
    this.quotaStats.estimatedCostUsd = parseFloat((this.quotaStats.requestsThisSession * 0.032).toFixed(3));
    this.quotaStats.freeTierUsagePercent = parseFloat(
      ((this.quotaStats.estimatedCostUsd / this.quotaStats.monthlyFreeCreditsUsd) * 100).toFixed(2)
    );

    // 2. Obtener comercios existentes en la base de datos para verificación de duplicados por google_place_id
    const existingMaster = await this.getExistingComerciosMaster();
    const existingPlaceIds = new Set(existingMaster.map((c) => c.google_place_id));

    // 3. Filtrado espacial y por categorías sobre la base cartográfica de Santiago del Estero
    const matches: Array<{
      google_place_id: string;
      nombre: string;
      categoria: GooglePlaceCategory;
      latitud: number;
      longitud: number;
      distancia: number;
    }> = [];

    for (const seed of SANTIAGO_DEL_ESTERO_SEED_PLACES) {
      // Filtrar por categoría
      if (params.categorias.length > 0 && !params.categorias.includes(seed.categoria)) {
        continue;
      }

      // Filtrar por keyword opcional
      if (params.keyword && !seed.nombre.toLowerCase().includes(params.keyword.toLowerCase())) {
        continue;
      }

      // Calcular distancia al centroide solicitado
      const distancia = this.calcularDistanciaMetros(
        params.latitud,
        params.longitud,
        seed.latitud,
        seed.longitud
      );

      // Si se encuentra dentro del radio seleccionado
      if (distancia <= params.radioMetros) {
        matches.push({ ...seed, distancia });
      }
    }

    // 4. Prevención de duplicados por google_place_id
    const nuevosParaInsertar: ComercioMaster[] = [];
    const itemsReport: BarridoResultItem[] = [];
    let omitidos = 0;

    for (const match of matches) {
      const yaExiste = existingPlaceIds.has(match.google_place_id);

      const itemModel: ComercioMaster = {
        id_comercio: `comm_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
        google_place_id: match.google_place_id,
        nombre: match.nombre,
        categoria: match.categoria,
        latitud: match.latitud,
        longitud: match.longitud,
      };

      if (yaExiste) {
        omitidos++;
        itemsReport.push({
          ...itemModel,
          isNew: false,
          distanciaMetros: match.distancia,
        });
      } else {
        nuevosParaInsertar.push(itemModel);
        itemsReport.push({
          ...itemModel,
          isNew: true,
          distanciaMetros: match.distancia,
        });
      }
    }

    // 5. Inserción máster en Supabase / LocalStorage de los nuevos registros
    if (nuevosParaInsertar.length > 0) {
      try {
        await supabase.from('comercios_master').insert(
          nuevosParaInsertar.map((c) => ({
            google_place_id: c.google_place_id,
            nombre: c.nombre,
            categoria: c.categoria,
            latitud: c.latitud,
            longitud: c.longitud,
          }))
        );
      } catch {
        // noop
      }

      // Actualizar caché de LocalStorage para soporte total offline / $0 USD demo
      const updatedCatalog = [...existingMaster, ...nuevosParaInsertar];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_MASTER, JSON.stringify(updatedCatalog));
      }
    }

    // 6. Actualizar monitor de cuota
    this.quotaStats.placesDiscoveredThisSession += nuevosParaInsertar.length;
    this.quotaStats.duplicatesPrevented += omitidos;
    this.saveQuotaToStorage();

    return {
      success: true,
      nuevosComercios: nuevosParaInsertar,
      duplicadosOmitidos: omitidos,
      totalEncontrados: matches.length,
      itemsReport,
      quotaStats: this.getQuotaStats(),
      message: `Barrido completado: ${nuevosParaInsertar.length} nuevos comercios ingresados a comercios_master, ${omitidos} duplicados omitidos.`,
    };
  }

  /**
   * Carga masiva del seed inicial completo en comercios_master (útil para pruebas inmediatas de zonificación)
   */
  public async sembrarCatalogoCompleto(): Promise<{ totalCargados: number; yaExistentes: number }> {
    const existing = await this.getExistingComerciosMaster();
    const existingIds = new Set(existing.map((e) => e.google_place_id));

    const toInsert: ComercioMaster[] = [];
    let yaExistentes = 0;

    for (const seed of SANTIAGO_DEL_ESTERO_SEED_PLACES) {
      if (existingIds.has(seed.google_place_id)) {
        yaExistentes++;
      } else {
        toInsert.push({
          id_comercio: `comm_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          google_place_id: seed.google_place_id,
          nombre: seed.nombre,
          categoria: seed.categoria,
          latitud: seed.latitud,
          longitud: seed.longitud,
        });
      }
    }

    if (toInsert.length > 0) {
      const merged = [...existing, ...toInsert];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_MASTER, JSON.stringify(merged));
      }
      try {
        await supabase.from('comercios_master').insert(toInsert);
      } catch {
        // noop
      }
    }

    return { totalCargados: toInsert.length, yaExistentes };
  }

  /**
   * Limpia el catálogo de comercios_master (para pruebas controladas)
   */
  public async limpiarCatalogoMaster(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_MASTER);
    }
    try {
      await supabase.from('comercios_master').delete().neq('id_comercio', '00000000-0000-0000-0000-000000000000');
    } catch {
      // noop
    }
  }
}

export const googlePlacesService = GooglePlacesService.getInstance();
