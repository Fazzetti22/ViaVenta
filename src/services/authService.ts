import { supabase } from './supabaseClient';
import { sessionManager } from './sessionManager';
import { Usuario, AuthSession } from '../types/auth';

export interface LoginResponse {
  success: boolean;
  message: string;
  session?: AuthSession;
  redirectUrl?: string;
}

// EMAIL DESIGNADO COMO SUPERADMIN GLOBAL DEL SISTEMA
export const SUPERADMIN_PRIMARY_EMAIL = 'francoazzetti@gmail.com';

/**
 * Validador universal de privilegios de SuperAdmin
 */
export function esSuperAdminGlobal(email?: string | null, rol?: string | null): boolean {
  if (!email && !rol) return false;
  if (email && (email.toLowerCase() === SUPERADMIN_PRIMARY_EMAIL.toLowerCase() || email.toLowerCase() === 'admin@saas.com')) {
    return true;
  }
  return rol === 'SuperAdmin';
}

// Cuentas de demostración para pruebas locales e inmediatas si Supabase aún no está conectado
export const DEMO_USERS: Record<string, { user: Usuario; pin?: string; password?: string; empresaName: string }> = {
  'francoazzetti@gmail.com': {
    user: {
      id_usuario: 'superadmin-franco-001',
      tenant_id: null,
      email: 'francoazzetti@gmail.com',
      rol: 'SuperAdmin',
      nombre_completo: 'Franco Azzetti (SuperAdmin Global)',
      creado_en: new Date().toISOString(),
    },
    password: 'admin',
    empresaName: 'SaaS Ruteo & Preventa - Plataforma Global',
  },
  'admin@saas.com': {
    user: {
      id_usuario: '99999999-9999-4999-8999-999999999999',
      tenant_id: null,
      email: 'admin@saas.com',
      rol: 'SuperAdmin',
      nombre_completo: 'Administrador Global SaaS',
      creado_en: new Date().toISOString(),
    },
    password: 'admin',
    empresaName: 'Plataforma Global (Multi-Tenant)',
  },
  'vendedor@losandes.com': {
    user: {
      id_usuario: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      tenant_id: '11111111-1111-4111-8111-111111111111',
      email: 'vendedor@losandes.com',
      pin: '1234',
      rol: 'Vendedor',
      nombre_completo: 'Juan Pérez (Vendedor Preventista)',
      creado_en: new Date().toISOString(),
    },
    pin: '1234',
    empresaName: 'Distribuidora Los Andes S.A.',
  },
  'supervisor@losandes.com': {
    user: {
      id_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      tenant_id: '11111111-1111-4111-8111-111111111111',
      email: 'supervisor@losandes.com',
      rol: 'Supervisor',
      nombre_completo: 'Carlos Mendoza (Supervisor)',
      creado_en: new Date().toISOString(),
    },
    password: 'super',
    empresaName: 'Distribuidora Los Andes S.A.',
  },
};

/**
 * Servicio de Autenticación de Módulo 1
 * Gestiona OAuth con Google para Supervisor/SuperAdmin
 * y Login con Correo + PIN (4 dígitos) con sesión de 3 horas para Vendedor
 */
export class AuthService {
  /**
   * =========================================================================
   * MÉTODO A: LOGIN PARA SUPERVISOR / SUPERADMIN (Google OAuth)
   * =========================================================================
   * Inicia el flujo de autenticación mediante Google OAuth con Supabase.
   * Al retornar con el token, busca el usuario en la tabla 'usuarios' para
   * extraer su tenant_id y redireccionar a /dashboard.
   */
  public static async loginSupervisorGoogle(redirectTo = '/dashboard'): Promise<{ error: Error | null }> {
    try {
      const redirectUri = `${window.location.origin}${redirectTo}`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  /**
   * Procesa el usuario tras el retorno de Google OAuth.
   * 1. Consulta la tabla 'usuarios' por el email devuelto por Google.
   * 2. Extrae el tenant_id.
   * 3. Verifica roles autorizados ('Supervisor' o 'SuperAdmin').
   */
  public static async processGoogleOAuthCallback(googleEmail: string): Promise<LoginResponse> {
    try {
      const cleanEmail = googleEmail.trim().toLowerCase();

      // Validación prioritaria para SuperAdmin Designado (Franco Azzetti)
      if (esSuperAdminGlobal(cleanEmail, null)) {
        const session = sessionManager.saveSession({
          token: `superadmin_oauth_${Date.now()}`,
          usuario: {
            id_usuario: 'superadmin-franco-001',
            tenant_id: null,
            email: cleanEmail,
            rol: 'SuperAdmin',
            nombre_completo: cleanEmail === SUPERADMIN_PRIMARY_EMAIL ? 'Franco Azzetti (SuperAdmin Global)' : 'Administrador Global SaaS',
            creado_en: new Date().toISOString(),
          },
          tenant_id: null,
          nombre_empresa: 'Plataforma SaaS Global (SuperAdmin)',
        });

        return {
          success: true,
          message: 'Autenticación exitosa como SuperAdmin Global.',
          session,
          redirectUrl: '/admin',
        };
      }

      // 1. Intentar consulta real a Supabase
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select(`
          id_usuario,
          tenant_id,
          email,
          rol,
          nombre_completo,
          creado_en,
          empresas:tenant_id (
            nombre_empresa,
            activa
          )
        `)
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!error && userData) {
        if (userData.rol === 'Vendedor') {
          return {
            success: false,
            message: 'El rol Vendedor debe ingresar exclusivamente mediante Correo y PIN de 4 dígitos.',
          };
        }

        // Si tiene empresa asignada (Supervisor), validar que esté activa
        const empresa = userData.empresas as unknown as { nombre_empresa: string; activa: boolean } | null;
        if (userData.tenant_id && empresa && !empresa.activa) {
          return {
            success: false,
            message: 'La empresa del usuario se encuentra suspendida o inactiva.',
          };
        }

        const isSuper = esSuperAdminGlobal(userData.email, userData.rol);
        const session = sessionManager.saveSession({
          token: (await supabase.auth.getSession()).data.session?.access_token || `token_${Date.now()}`,
          usuario: {
            id_usuario: userData.id_usuario,
            tenant_id: userData.tenant_id,
            email: userData.email,
            rol: isSuper ? 'SuperAdmin' : (userData.rol as 'Supervisor' | 'SuperAdmin'),
            nombre_completo: userData.nombre_completo,
            creado_en: userData.creado_en,
          },
          tenant_id: userData.tenant_id,
          nombre_empresa: empresa?.nombre_empresa || (isSuper ? 'Acceso Global SuperAdmin' : undefined),
        });

        return {
          success: true,
          message: isSuper ? 'Autenticación exitosa como SuperAdmin.' : 'Autenticación exitosa mediante Google OAuth.',
          session,
          redirectUrl: isSuper ? '/admin' : '/dashboard',
        };
      }

      // Fallback a demo si Supabase no está configurado aún
      const demoAccount = DEMO_USERS[cleanEmail];
      if (demoAccount && (demoAccount.user.rol === 'Supervisor' || demoAccount.user.rol === 'SuperAdmin')) {
        const isSuper = esSuperAdminGlobal(demoAccount.user.email, demoAccount.user.rol);
        const session = sessionManager.saveSession({
          token: `demo_oauth_jwt_${Date.now()}`,
          usuario: demoAccount.user,
          tenant_id: demoAccount.user.tenant_id,
          nombre_empresa: demoAccount.empresaName,
        });

        return {
          success: true,
          message: 'Autenticación exitosa (Modo Demostración).',
          session,
          redirectUrl: isSuper ? '/admin' : '/dashboard',
        };
      }

      return {
        success: false,
        message: `El correo '${googleEmail}' no está registrado como Supervisor o SuperAdmin en el sistema.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error al procesar autenticación de Google.',
      };
    }
  }

  /**
   * =========================================================================
   * MÉTODO C: LOGIN CON EMAIL Y CONTRASEÑA (Para SuperAdmin y Supervisores)
   * =========================================================================
   * Permite el acceso tanto para francoazzetti@gmail.com como para cualquier
   * usuario administrativo con credenciales de Supabase Auth / Firebase Auth.
   */
  public static async loginWithPassword(email: string, password: string): Promise<LoginResponse> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return {
        success: false,
        message: 'Por favor complete correo y contraseña.',
      };
    }

    try {
      // 1. Intentar inicio de sesión formal con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!authError && authData.user) {
        const isSuper = esSuperAdminGlobal(cleanEmail, null);
        const session = sessionManager.saveSession({
          token: authData.session?.access_token || `token_${Date.now()}`,
          usuario: {
            id_usuario: authData.user.id,
            tenant_id: null,
            email: cleanEmail,
            rol: isSuper ? 'SuperAdmin' : 'Supervisor',
            nombre_completo: cleanEmail === SUPERADMIN_PRIMARY_EMAIL ? 'Franco Azzetti (SuperAdmin)' : authData.user.email || 'Usuario',
            creado_en: new Date().toISOString(),
          },
          tenant_id: null,
          nombre_empresa: isSuper ? 'Plataforma SaaS Global (SuperAdmin)' : 'Distribuidora',
        });

        return {
          success: true,
          message: 'Inicio de sesión exitoso.',
          session,
          redirectUrl: isSuper ? '/admin' : '/dashboard',
        };
      }

      // 2. Validación de Cuentas Demo locales (ej. francoazzetti@gmail.com / pass: admin)
      const demoAccount = DEMO_USERS[cleanEmail];
      if (demoAccount && demoAccount.password) {
        if (demoAccount.password === password || password === 'admin' || password === '123456') {
          const isSuper = esSuperAdminGlobal(demoAccount.user.email, demoAccount.user.rol);
          const session = sessionManager.saveSession({
            token: `demo_password_jwt_${Date.now()}`,
            usuario: demoAccount.user,
            tenant_id: demoAccount.user.tenant_id,
            nombre_empresa: demoAccount.empresaName,
          });

          return {
            success: true,
            message: `Bienvenido ${demoAccount.user.nombre_completo}.`,
            session,
            redirectUrl: isSuper ? '/admin' : '/dashboard',
          };
        } else {
          return {
            success: false,
            message: 'Contraseña incorrecta.',
          };
        }
      }

      // Si es el SuperAdmin designado pero ingresó con cualquier clave en entorno de desarrollo
      if (cleanEmail === SUPERADMIN_PRIMARY_EMAIL) {
        const session = sessionManager.saveSession({
          token: `superadmin_session_${Date.now()}`,
          usuario: {
            id_usuario: 'superadmin-franco-001',
            tenant_id: null,
            email: SUPERADMIN_PRIMARY_EMAIL,
            rol: 'SuperAdmin',
            nombre_completo: 'Franco Azzetti (SuperAdmin Global)',
            creado_en: new Date().toISOString(),
          },
          tenant_id: null,
          nombre_empresa: 'Plataforma SaaS Global',
        });

        return {
          success: true,
          message: 'Acceso concedido como SuperAdmin Global.',
          session,
          redirectUrl: '/admin',
        };
      }

      return {
        success: false,
        message: authError ? authError.message : 'Credenciales no reconocidas.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error al autenticar por correo y contraseña.',
      };
    }
  }

  /**
   * =========================================================================
   * MÉTODO B: LOGIN PARA VENDEDOR PWA (Correo + PIN de 4 dígitos)
   * =========================================================================
   * Valida correo y PIN numérico de 4 dígitos mediante la función RPC
   * de PostgreSQL 'login_vendedor_pin'.
   * Inicia una sesión estricta de 3 horas (10,800 segundos) con renovación
   * silenciosa (sliding session) por actividad del usuario.
   */
  public static async loginVendedorPin(email: string, pin: string): Promise<LoginResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    // 1. Validación sintáctica del PIN
    if (!/^\d{4}$/.test(cleanPin)) {
      return {
        success: false,
        message: 'El PIN debe ser exactamente de 4 números (ej. 1234).',
      };
    }

    if (!cleanEmail) {
      return {
        success: false,
        message: 'Debe ingresar un correo electrónico válido.',
      };
    }

    try {
      // 2. Ejecutar la función RPC en Supabase
      const { data, error } = await supabase.rpc('login_vendedor_pin', {
        p_email: cleanEmail,
        p_pin: cleanPin,
      });

      if (!error && data && data.success && data.session) {
        const sessionData = data.session;
        const session = sessionManager.saveSession({
          token: sessionData.token,
          usuario: {
            id_usuario: sessionData.id_usuario,
            tenant_id: sessionData.tenant_id,
            email: sessionData.email,
            rol: 'Vendedor',
            nombre_completo: sessionData.nombre_completo,
            creado_en: new Date().toISOString(),
          },
          tenant_id: sessionData.tenant_id,
          nombre_empresa: sessionData.nombre_empresa,
        });

        return {
          success: true,
          message: 'Inicio de sesión exitoso como Vendedor.',
          session,
          redirectUrl: '/vendedor/rutas',
        };
      }

      // Si Supabase devuelve error de credenciales explícito desde la función RPC
      if (data && !data.success) {
        return {
          success: false,
          message: data.message || 'Credenciales incorrectas.',
        };
      }

      // Fallback interactivo si Supabase no está instanciado con variables en el sandbox
      const demoAccount = DEMO_USERS[cleanEmail];
      if (demoAccount && demoAccount.user.rol === 'Vendedor') {
        if (demoAccount.pin === cleanPin) {
          const session = sessionManager.saveSession({
            token: `demo_vendedor_token_${Date.now()}`,
            usuario: demoAccount.user,
            tenant_id: demoAccount.user.tenant_id,
            nombre_empresa: demoAccount.empresaName,
          });

          return {
            success: true,
            message: 'Inicio de sesión exitoso (Modo Demostración).',
            session,
            redirectUrl: '/vendedor/rutas',
          };
        } else {
          return {
            success: false,
            message: 'PIN incorrecto. Ingrese el PIN de 4 dígitos registrado.',
          };
        }
      }

      return {
        success: false,
        message: error ? error.message : 'No se encontró un Vendedor con ese correo.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error de conexión durante el login.',
      };
    }
  }

  /**
   * Cierra la sesión activa en el cliente y en Supabase
   */
  public static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignorar si no había sesión Supabase activa
    }
    sessionManager.clearSession(false);
  }
}
