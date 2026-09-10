import { ComercioMaster, Zona } from '../types/auth';
import { GridZoneComputed, SectorGeografico } from '../types/admin';
import { googlePlacesService } from './googlePlacesService';
import { supabase } from './supabaseClient';

// Centroide por defecto: Santiago del Estero Capital, Argentina
export const DEFAULT_CENTROID = {
  lat: -27.7880,
  lng: -64.2610,
  nombre: 'Santiago del Estero (Plaza Libertad)',
};

// Parámetros de equilibrio del algoritmo Grid (Opción C)
export const TARGET_MIN_COMERCIOS_POR_ZONA = 15;
export const TARGET_MAX_COMERCIOS_POR_ZONA = 30;
export const TARGET_OPTIMO_POR_ZONA = 25; // 1 jornada realizable de calle (25 comercios)

// Storage key para persistir las zonas clonadas por tenant en el cliente
const STORAGE_KEY_TENANT_ZONAS = 'saas_ruteo_tenant_zonas_v1';

export class GridClusteringService {
  private static instance: GridClusteringService;

  private constructor() {}

  public static getInstance(): GridClusteringService {
    if (!GridClusteringService.instance) {
      GridClusteringService.instance = new GridClusteringService();
    }
    return GridClusteringService.instance;
  }

  /**
   * Determina el sector geográfico según la posición relativa al centroide
   * con umbral de amortiguación para el CENTRO urbano.
   */
  private determinarSector(
    lat: number,
    lng: number,
    cLat = DEFAULT_CENTROID.lat,
    cLng = DEFAULT_CENTROID.lng
  ): SectorGeografico {
    const distanciaCentroMetros = googlePlacesService.calcularDistanciaMetros(lat, lng, cLat, cLng);

    // Si está a menos de 1.4 km de la Plaza Libertad, se clasifica como CENTRO
    if (distanciaCentroMetros <= 1400) {
      return 'CENTRO';
    }

    const dLat = lat - cLat; // Negativo = SUR, Positivo = NORTE
    const dLng = lng - cLng; // Positivo = ESTE (La Banda / Río Dulce), Negativo = OESTE

    // Comparar magnitud latitudinal vs longitudinal
    if (Math.abs(dLat) >= Math.abs(dLng) * 0.85) {
      return dLat < 0 ? 'SUR' : 'NORTE';
    } else {
      return dLng > 0 ? 'ESTE' : 'OESTE';
    }
  }

  /**
   * ALGORITMO GRID (Opción C - Alfa-Numérica)
   * Toma la totalidad o un subconjunto de comercios_master y los agrupa en
   * cuadrículas equilibradas de 20-30 comercios identificadas con códigos
   * geográficos secuenciales (ej. SUR-01, SUR-02, CENTRO-01, NORTE-01).
   */
  public agruparComerciosEnGrid(
    comercios: ComercioMaster[],
    options?: {
      targetPorZona?: number;
      centroideLat?: number;
      centroideLng?: number;
    }
  ): GridZoneComputed[] {
    if (!comercios || comercios.length === 0) return [];

    const targetSize = options?.targetPorZona || TARGET_OPTIMO_POR_ZONA;
    const cLat = options?.centroideLat ?? DEFAULT_CENTROID.lat;
    const cLng = options?.centroideLng ?? DEFAULT_CENTROID.lng;

    // 1. Clasificar comercios en baldes por sector geográfico
    const buckets: Record<SectorGeografico, ComercioMaster[]> = {
      CENTRO: [],
      NORTE: [],
      SUR: [],
      ESTE: [],
      OESTE: [],
    };

    for (const c of comercios) {
      const sector = this.determinarSector(c.latitud, c.longitud, cLat, cLng);
      buckets[sector].push(c);
    }

    const resultZonas: GridZoneComputed[] = [];
    const sectoresOrden: SectorGeografico[] = ['CENTRO', 'SUR', 'NORTE', 'ESTE', 'OESTE'];

    // 2. Para cada sector, ordenar espacialmente y segmentar en lotes de 20 a 30 comercios
    for (const sector of sectoresOrden) {
      const sectorItems = buckets[sector];
      if (sectorItems.length === 0) continue;

      // Ordenamiento espacial continuo (K-d / proximidad angular y lineal respecto al centro)
      // para asegurar contigüidad física en el recorrido del vendedor
      sectorItems.sort((a, b) => {
        if (sector === 'CENTRO') {
          // Espiral desde el centro hacia afuera
          const distA = googlePlacesService.calcularDistanciaMetros(cLat, cLng, a.latitud, a.longitud);
          const distB = googlePlacesService.calcularDistanciaMetros(cLat, cLng, b.latitud, b.longitud);
          return distA - distB;
        } else if (sector === 'SUR') {
          // De norte a sur (orden descendente en latitud)
          return b.latitud - a.latitud || a.longitud - b.longitud;
        } else if (sector === 'NORTE') {
          // De sur a norte
          return a.latitud - b.latitud || a.longitud - b.longitud;
        } else if (sector === 'ESTE') {
          // De oeste a este
          return a.longitud - b.longitud || a.latitud - b.latitud;
        } else {
          // OESTE: de este a oeste
          return b.longitud - a.longitud || a.latitud - b.latitud;
        }
      });

      // Segmentación equilibrada en zonas
      const totalSector = sectorItems.length;
      const numZonasSector = Math.max(1, Math.round(totalSector / targetSize));
      const itemsPerZone = Math.ceil(totalSector / numZonasSector);

      for (let i = 0; i < numZonasSector; i++) {
        const start = i * itemsPerZone;
        const end = Math.min(start + itemsPerZone, totalSector);
        const chunk = sectorItems.slice(start, end);

        if (chunk.length === 0) continue;

        const secIndex = i + 1;
        const codigoZona = `${sector}-${secIndex.toString().padStart(2, '0')}`;

        // Calcular centroide medio de la zona
        const sumLat = chunk.reduce((acc, curr) => acc + curr.latitud, 0);
        const sumLng = chunk.reduce((acc, curr) => acc + curr.longitud, 0);
        const zLat = sumLat / chunk.length;
        const zLng = sumLng / chunk.length;

        // Calcular radio aproximado de la zona
        let maxDist = 0;
        for (const item of chunk) {
          const d = googlePlacesService.calcularDistanciaMetros(zLat, zLng, item.latitud, item.longitud);
          if (d > maxDist) maxDist = d;
        }

        resultZonas.push({
          codigo_zona: codigoZona,
          sector,
          numero_secuencial: secIndex,
          centroide_lat: parseFloat(zLat.toFixed(6)),
          centroide_lng: parseFloat(zLng.toFixed(6)),
          total_comercios: chunk.length,
          comercios: chunk,
          radio_estimado_metros: Math.max(250, maxDist),
        });
      }
    }

    return resultZonas;
  }

  /**
   * ASIGNACIÓN DE ZONAS MÁSTER A TENANT:
   * Toma las zonas generadas por el algoritmo Grid y las clona o vincula
   * dentro de la tabla 'zonas' asignándoles el tenant_id de la empresa destino.
   */
  public async asignarZonasMasterATenant(
    tenantId: string,
    zonasPersonalizadas?: GridZoneComputed[]
  ): Promise<{
    success: boolean;
    tenantId: string;
    zonasAsignadasCount: number;
    zonas: Array<{ id_zona: string; nombre_zona: string; tenant_id: string }>;
    message: string;
  }> {
    if (!tenantId) {
      return {
        success: false,
        tenantId: '',
        zonasAsignadasCount: 0,
        zonas: [],
        message: 'Debe especificar un tenant_id válido.',
      };
    }

    // 1. Obtener zonas Grid (usar las provistas o calcularlas sobre comercios_master)
    let gridZonas = zonasPersonalizadas;
    if (!gridZonas || gridZonas.length === 0) {
      const comerciosMaster = await googlePlacesService.getExistingComerciosMaster();
      gridZonas = this.agruparComerciosEnGrid(comerciosMaster);
    }

    if (gridZonas.length === 0) {
      return {
        success: false,
        tenantId,
        zonasAsignadasCount: 0,
        zonas: [],
        message: 'No existen comercios en comercios_master para generar zonas.',
      };
    }

    // 2. Preparar registros para la tabla 'zonas'
    const registrosZonas = gridZonas.map((gz) => ({
      id_zona: `zona_${tenantId.substring(0, 6)}_${gz.codigo_zona.toLowerCase()}_${Date.now()}`,
      tenant_id: tenantId,
      nombre_zona: gz.codigo_zona,
      activa: true,
    }));

    // 3. Persistir en Supabase (o actualizar tabla)
    try {
      await supabase.from('zonas').insert(
        registrosZonas.map((rz) => ({
          tenant_id: rz.tenant_id,
          nombre_zona: rz.nombre_zona,
          activa: rz.activa,
        }))
      );
    } catch {
      // Ignorar si falla RLS o conexión de base de datos
    }

    // 4. Persistir en LocalStorage para sincronización inmediata de la demo
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_TENANT_ZONAS);
      let map: Record<string, Array<{ id_zona: string; nombre_zona: string; tenant_id: string }>> = {};
      if (raw) {
        try {
          map = JSON.parse(raw);
        } catch {
          map = {};
        }
      }
      map[tenantId] = registrosZonas;
      localStorage.setItem(STORAGE_KEY_TENANT_ZONAS, JSON.stringify(map));
    }

    return {
      success: true,
      tenantId,
      zonasAsignadasCount: registrosZonas.length,
      zonas: registrosZonas,
      message: `Se asignaron exitosamente ${registrosZonas.length} zonas alfa-numéricas (${gridZonas.map((z) => z.codigo_zona).join(', ')}) al tenant '${tenantId}'.`,
    };
  }

  /**
   * Obtiene las zonas asignadas a un tenant determinado
   */
  public async getZonasPorTenant(tenantId: string): Promise<Zona[]> {
    try {
      const { data, error } = await supabase.from('zonas').select('*').eq('tenant_id', tenantId);
      if (!error && data && data.length > 0) {
        return data as Zona[];
      }
    } catch {
      // noop
    }

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_TENANT_ZONAS);
      if (raw) {
        try {
          const map = JSON.parse(raw);
          if (map[tenantId]) return map[tenantId];
        } catch {
          // noop
        }
      }
    }
    return [];
  }
}

export const gridClusteringService = GridClusteringService.getInstance();
