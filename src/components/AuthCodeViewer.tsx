import React, { useState } from 'react';
import { Copy, Check, FileCode, Shield, Clock, Database } from 'lucide-react';

export const AuthCodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'authService' | 'sessionManager' | 'types'>('authService');
  const [copied, setCopied] = useState(false);

  const codeFiles = {
    authService: {
      fileName: 'authService.ts',
      description: 'Handlers de Login para Google OAuth (Supervisor/SuperAdmin) y Correo/PIN (Vendedor)',
      code: `import { supabase } from './supabaseClient';
import { sessionManager } from './sessionManager';
import { Usuario, AuthSession } from '../types/auth';

export interface LoginResponse {
  success: boolean;
  message: string;
  session?: AuthSession;
  redirectUrl?: string;
}

export class AuthService {
  /**
   * FLIGHT A: LOGIN SUPERVISOR / SUPERADMIN (Google OAuth)
   * Dispara el flujo OAuth con redirección a /dashboard.
   */
  public static async loginSupervisorGoogle(redirectTo = '/dashboard') {
    const redirectUri = \`\${window.location.origin}\${redirectTo}\`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    return { error: error ? new Error(error.message) : null };
  }

  /**
   * Callback Google OAuth:
   * 1. Consulta 'usuarios' por email de Google.
   * 2. Extrae tenant_id y rol.
   * 3. Guarda la sesión y redirecciona a /dashboard.
   */
  public static async processGoogleOAuthCallback(googleEmail: string): Promise<LoginResponse> {
    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('id_usuario, tenant_id, email, rol, nombre_completo, creado_en, empresas:tenant_id(nombre_empresa, activa)')
      .eq('email', googleEmail)
      .maybeSingle();

    if (error || !userData) {
      return { success: false, message: 'Usuario no registrado como Supervisor o SuperAdmin.' };
    }

    if (userData.rol === 'Vendedor') {
      return { success: false, message: 'El rol Vendedor debe ingresar exclusivamente mediante Correo y PIN de 4 dígitos.' };
    }

    // Extracción automática del tenant_id
    const tenantId = userData.tenant_id; // null únicamente para SuperAdmin

    const session = sessionManager.saveSession({
      token: (await supabase.auth.getSession()).data.session?.access_token || \`token_\${Date.now()}\`,
      usuario: {
        id_usuario: userData.id_usuario,
        tenant_id: tenantId,
        email: userData.email,
        rol: userData.rol,
        nombre_completo: userData.nombre_completo,
        creado_en: userData.creado_en,
      },
      tenant_id: tenantId,
    });

    return {
      success: true,
      message: 'Autenticación exitosa',
      session,
      redirectUrl: '/dashboard',
    };
  }

  /**
   * FLIGHT B: LOGIN VENDEDOR PWA (Correo + PIN de 4 dígitos)
   * 1. Valida formato de 4 dígitos numéricos.
   * 2. Llama a la función PostgreSQL 'login_vendedor_pin'.
   * 3. Devuelve token e inicializa sesión estricta de 3 horas (10,800s).
   */
  public static async loginVendedorPin(email: string, pin: string): Promise<LoginResponse> {
    const cleanPin = pin.trim();
    if (!/^\\d{4}$/.test(cleanPin)) {
      return { success: false, message: 'El PIN debe ser exactamente de 4 dígitos.' };
    }

    const { data, error } = await supabase.rpc('login_vendedor_pin', {
      p_email: email.trim().toLowerCase(),
      p_pin: cleanPin,
    });

    if (error || !data || !data.success) {
      return { success: false, message: data?.message || error?.message || 'Error de credenciales.' };
    }

    // Persiste en Storage con expiración estricta de 3 horas
    const session = sessionManager.saveSession({
      token: data.session.token,
      usuario: {
        id_usuario: data.session.id_usuario,
        tenant_id: data.session.tenant_id,
        email: data.session.email,
        rol: 'Vendedor',
        nombre_completo: data.session.nombre_completo,
        creado_en: new Date().toISOString(),
      },
      tenant_id: data.session.tenant_id,
      nombre_empresa: data.session.nombre_empresa,
    });

    return {
      success: true,
      message: 'Inicio de sesión exitoso como Vendedor.',
      session,
      redirectUrl: '/vendedor/rutas',
    };
  }

  public static async logout(): Promise<void> {
    await supabase.auth.signOut();
    sessionManager.clearSession(false);
  }
}`,
    },
    sessionManager: {
      fileName: 'sessionManager.ts',
      description: 'Gestor de Sesión con ventana deslizante estricta de 3 Horas (10,800 segundos)',
      code: `import { AuthSession } from '../types/auth';

export const SESSION_DURATION_SECONDS = 10800; // 3 Horas exactas
export const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;
export const STORAGE_KEY = 'saas_ruteo_auth_session_v1';

export class SessionManager {
  private static instance: SessionManager;
  private memorySession: AuthSession | null = null;
  private expirationListeners: Set<() => void> = new Set();

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) SessionManager.instance = new SessionManager();
    return SessionManager.instance;
  }

  /**
   * Guarda una nueva sesión inicializando el temporizador de 3 horas
   */
  public saveSession(sessionData: Omit<AuthSession, 'issuedAt' | 'expiresAt' | 'lastActivity'>): AuthSession {
    const now = Date.now();
    const session: AuthSession = {
      ...sessionData,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_MS, // Expiración a 3 horas
      lastActivity: now,
    };

    this.memorySession = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.attachActivityListeners();
    return session;
  }

  /**
   * Obtiene la sesión activa. Si pasaron 3 horas sin actividad, la invalida.
   */
  public getSession(): AuthSession | null {
    if (!this.memorySession) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      this.memorySession = JSON.parse(raw);
    }

    if (this.memorySession && Date.now() >= this.memorySession.expiresAt) {
      this.clearSession(true); // Expirada
      return null;
    }

    return this.memorySession;
  }

  /**
   * RENOVACIÓN SILENCIOSA (SLIDING SESSION):
   * Cada acción realizada en la app reinicia el temporizador de 3 horas.
   */
  public recordActivity(): void {
    if (!this.memorySession) return;
    const now = Date.now();
    if (now >= this.memorySession.expiresAt) {
      this.clearSession(true);
      return;
    }

    this.memorySession.lastActivity = now;
    this.memorySession.expiresAt = now + SESSION_DURATION_MS; // +3 Horas desde la acción
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memorySession));
  }

  /**
   * Listeners globales para detectar actividad del vendedor en la PWA
   */
  public attachActivityListeners(): void {
    if (typeof window === 'undefined') return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => window.addEventListener(evt, () => this.recordActivity(), { passive: true }));
  }

  public clearSession(dueToExpiration = false): void {
    this.memorySession = null;
    localStorage.removeItem(STORAGE_KEY);
    if (dueToExpiration) {
      this.expirationListeners.forEach(listener => listener());
    }
  }

  public onSessionExpired(cb: () => void) {
    this.expirationListeners.add(cb);
    return () => this.expirationListeners.delete(cb);
  }
}

export const sessionManager = SessionManager.getInstance();`,
    },
    types: {
      fileName: 'types/auth.ts',
      description: 'Interfaces TypeScript para Empresas, Usuarios, RLS y Sesiones',
      code: `export type UserRole = 'SuperAdmin' | 'Supervisor' | 'Vendedor';

export interface Empresa {
  tenant_id: string;
  nombre_empresa: string;
  activa: boolean;
  creado_en: string;
}

export interface Usuario {
  id_usuario: string;
  tenant_id: string | null; // Nullable únicamente para SuperAdmin
  email: string;
  pin?: string | null; // Solo para rol Vendedor (VARCHAR 4 dígitos)
  rol: UserRole;
  nombre_completo: string;
  creado_en: string;
}

export interface AuthSession {
  token: string;
  usuario: Usuario;
  tenant_id: string | null;
  nombre_empresa?: string;
  issuedAt: number;
  expiresAt: number; // issuedAt + 10,800,000 ms (3 horas)
  lastActivity: number;
}`,
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeFiles[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('authService')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'authService'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>authService.ts (Google + PIN)</span>
          </button>

          <button
            onClick={() => setActiveTab('sessionManager')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sessionManager'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>sessionManager.ts (3h Sliding)</span>
          </button>

          <button
            onClick={() => setActiveTab('types')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'types'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>types/auth.ts (Modelos)</span>
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado al portapapeles' : 'Copiar Archivo'}</span>
        </button>
      </div>

      {/* Code Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-medium text-slate-300">
              {codeFiles[activeTab].fileName}
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              — {codeFiles[activeTab].description}
            </span>
          </div>
        </div>

        <div className="p-4 max-h-[550px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-slate-950">
          <pre className="whitespace-pre overflow-x-auto selection:bg-indigo-900 selection:text-white">
            {codeFiles[activeTab].code}
          </pre>
        </div>
      </div>
    </div>
  );
};
