import { AuthSession } from '../types/auth';

/**
 * Constantes para configuración de sesión
 * 3 Horas = 180 minutos = 10,800 segundos = 10,800,000 milisegundos
 */
export const SESSION_DURATION_SECONDS = 10800;
export const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;
export const STORAGE_KEY = 'saas_ruteo_auth_session_v1';
export const ACTIVITY_THROTTLE_MS = 10000; // Evita escrituras excesivas a Storage (máx 1 cada 10s en background)

type SessionCallback = (session: AuthSession | null) => void;
type ExpirationCallback = () => void;

export class SessionManager {
  private static instance: SessionManager;
  private memorySession: AuthSession | null = null;
  private lastSlidingUpdate = 0;
  private sessionListeners: Set<SessionCallback> = new Set();
  private expirationListeners: Set<ExpirationCallback> = new Set();
  private activityListenerAttached = false;
  private checkIntervalTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadFromStorage();
    this.startHeartbeat();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Carga y valida la sesión desde LocalStorage
   */
  private loadFromStorage(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.memorySession = null;
        return null;
      }

      const parsed: AuthSession = JSON.parse(raw);
      const now = Date.now();

      // Validación de expiración estricta de 3 horas
      if (now >= parsed.expiresAt) {
        this.clearSession(true);
        return null;
      }

      this.memorySession = parsed;
      return parsed;
    } catch {
      this.memorySession = null;
      return null;
    }
  }

  /**
   * Guarda una nueva sesión inicializando el temporizador de 3 horas
   */
  public saveSession(sessionData: Omit<AuthSession, 'issuedAt' | 'expiresAt' | 'lastActivity'>): AuthSession {
    const now = Date.now();
    const session: AuthSession = {
      ...sessionData,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      lastActivity: now,
    };

    this.memorySession = session;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Advertencia: No se pudo persistir en localStorage:', e);
    }

    this.attachActivityListeners();
    this.notifyListeners();
    return session;
  }

  /**
   * Obtiene la sesión actual activa.
   * Si ya transcurrieron 3 horas sin actividad, la invalida y retorna null.
   */
  public getSession(): AuthSession | null {
    if (!this.memorySession) {
      return this.loadFromStorage();
    }

    const now = Date.now();
    if (now >= this.memorySession.expiresAt) {
      this.clearSession(true);
      return null;
    }

    return this.memorySession;
  }

  /**
   * Renovación Silenciosa (Sliding Session):
   * Cada acción realizada por el usuario reinicia el contador a 3 horas completas (10,800s)
   */
  public recordActivity(force = false): void {
    if (!this.memorySession) return;

    const now = Date.now();

    // Comprobar si ya expiró antes de extenderla
    if (now >= this.memorySession.expiresAt) {
      this.clearSession(true);
      return;
    }

    // Throttling para evitar escribir a disco en cada micro-evento (salvo force = true)
    if (!force && now - this.lastSlidingUpdate < ACTIVITY_THROTTLE_MS) {
      return;
    }

    this.lastSlidingUpdate = now;
    this.memorySession.lastActivity = now;
    this.memorySession.expiresAt = now + SESSION_DURATION_MS; // +3 Horas desde la última acción

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memorySession));
    } catch {
      // Ignorar fallas transitorias de cuota
    }

    this.notifyListeners();
  }

  /**
   * Tiempo restante en segundos hasta la expiración
   */
  public getTimeRemainingSeconds(): number {
    const session = this.getSession();
    if (!session) return 0;
    const remainingMs = Math.max(0, session.expiresAt - Date.now());
    return Math.floor(remainingMs / 1000);
  }

  /**
   * Elimina la sesión y opcionalmente notifica redirección al login
   */
  public clearSession(dueToExpiration = false): void {
    this.memorySession = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }

    this.detachActivityListeners();
    this.notifyListeners();

    if (dueToExpiration) {
      this.expirationListeners.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          console.error('Error en listener de expiración:', err);
        }
      });
    }
  }

  /**
   * Simulación directa para testing: acelera la expiración
   */
  public simulateExpiration(): void {
    if (!this.memorySession) return;
    this.memorySession.expiresAt = Date.now() - 1000;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memorySession));
    } catch {
      // noop
    }
    this.clearSession(true);
  }

  /**
   * Suscribe escuchas a cambios de sesión
   */
  public onSessionChange(callback: SessionCallback): () => void {
    this.sessionListeners.add(callback);
    callback(this.getSession());
    return () => this.sessionListeners.delete(callback);
  }

  /**
   * Suscribe escuchas a eventos de expiración por inactividad
   */
  public onSessionExpired(callback: ExpirationCallback): () => void {
    this.expirationListeners.add(callback);
    return () => this.expirationListeners.delete(callback);
  }

  private notifyListeners(): void {
    const current = this.getSession();
    this.sessionListeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error en listener de sesión:', err);
      }
    });
  }

  /**
   * Escucha eventos de usuario para mantener activa la sesión deslizante
   */
  private handleUserInteraction = () => {
    this.recordActivity(false);
  };

  public attachActivityListeners(): void {
    if (this.activityListenerAttached || typeof window === 'undefined') return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, this.handleUserInteraction, { passive: true });
    });

    this.activityListenerAttached = true;
  }

  public detachActivityListeners(): void {
    if (!this.activityListenerAttached || typeof window === 'undefined') return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => {
      window.removeEventListener(evt, this.handleUserInteraction);
    });

    this.activityListenerAttached = false;
  }

  /**
   * Heartbeat para chequear periódicamente si venció la sesión
   */
  private startHeartbeat(): void {
    if (typeof window === 'undefined') return;

    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
    }

    this.checkIntervalTimer = setInterval(() => {
      if (this.memorySession) {
        if (Date.now() >= this.memorySession.expiresAt) {
          this.clearSession(true);
        }
      }
    }, 1000);
  }
}

export const sessionManager = SessionManager.getInstance();
