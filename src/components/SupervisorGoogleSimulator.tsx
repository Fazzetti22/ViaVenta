import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { sessionManager } from '../services/sessionManager';
import { AuthSession } from '../types/auth';
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  MapPin, 
  Package, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Compass,
  ArrowRight,
  TrendingUp,
  Globe,
  LayoutDashboard
} from 'lucide-react';

interface SupervisorGoogleSimulatorProps {
  onOpenDashboard?: () => void;
}

export const SupervisorGoogleSimulator: React.FC<SupervisorGoogleSimulatorProps> = ({ onOpenDashboard }) => {
  const [session, setSession] = useState<AuthSession | null>(sessionManager.getSession());
  const [selectedEmail, setSelectedEmail] = useState<'francoazzetti' | 'supervisor' | 'superadmin' | 'unauthorized'>('francoazzetti');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string } | null>(null);

  const mockGoogleAccounts = {
    francoazzetti: {
      email: 'francoazzetti@gmail.com',
      name: 'Franco Azzetti (SuperAdmin Global)',
      role: 'SuperAdmin',
      tenant: 'Acceso Global SaaS Master',
      tenantId: null,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    },
    supervisor: {
      email: 'supervisor@losandes.com',
      name: 'Carlos Mendoza',
      role: 'Supervisor',
      tenant: 'Distribuidora Los Andes S.A.',
      tenantId: '11111111-1111-4111-8111-111111111111',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    superadmin: {
      email: 'admin@saas.com',
      name: 'Administrador Global SaaS',
      role: 'SuperAdmin',
      tenant: 'Acceso Global (Todas las empresas)',
      tenantId: null,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
    unauthorized: {
      email: 'externo@gmail.com',
      name: 'Usuario No Registrado',
      role: 'Desconocido',
      tenant: 'Ninguno',
      tenantId: null,
      avatar: '',
    },
  };

  const handleSimulateGoogleLogin = async () => {
    setLoading(true);
    setResultMessage(null);

    const account = mockGoogleAccounts[selectedEmail];
    
    // Simular latencia de autenticación OAuth y consulta a tabla usuarios
    await new Promise((r) => setTimeout(r, 600));

    const response = await AuthService.processGoogleOAuthCallback(account.email);
    setLoading(false);

    if (response.success && response.session) {
      setSession(response.session);
      setResultMessage({
        success: true,
        text: `¡Autenticación con Google exitosa! Tenant '${response.session.nombre_empresa || 'Global'}' resuelto. Redirigiendo a ${response.redirectUrl}.`,
      });
    } else {
      setResultMessage({
        success: false,
        text: response.message,
      });
    }
  };

  const handleRealGoogleOAuth = async () => {
    setLoading(true);
    const { error } = await AuthService.loginSupervisorGoogle('/dashboard');
    setLoading(false);
    if (error) {
      setResultMessage({
        success: false,
        text: `Error conectando con Supabase OAuth: ${error.message}. (Usa el botón de simulación abajo si aún no has cargado tus claves en .env)`,
      });
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setSession(null);
    setResultMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Selector de Flujo o Dashboard */}
      {session && (session.usuario.rol === 'Supervisor' || session.usuario.rol === 'SuperAdmin') ? (
        // VISTA DASHBOARD AUTENTICADA (/dashboard)
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
          {/* Header del Dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  session.usuario.rol === 'SuperAdmin'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}>
                  {session.usuario.rol === 'SuperAdmin' ? 'SuperAdmin Global' : 'Supervisor de Empresa'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Ruta activa: <strong className="text-emerald-400">/dashboard</strong>
                </span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Panel de Supervisión Multi-Tenant
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sesión autenticada mediante Google OAuth con aislamiento estricto de datos en Supabase.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onOpenDashboard && (
                <button
                  onClick={onOpenDashboard}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Abrir Dashboard Módulo 4</span>
                </button>
              )}
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-white">{session.usuario.nombre_completo}</div>
                <div className="text-[11px] text-slate-400">{session.usuario.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          {/* Tarjeta de Extracción Automática de Tenant */}
          <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  Tenant Extraído Automáticamente
                </div>
                <div className="text-sm font-bold text-white">
                  {session.nombre_empresa || 'Acceso Global Multi-Tenant'}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  UUID Tenant: {session.tenant_id || 'NULL (Permiso Global SuperAdmin)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Políticas RLS Aplicadas en PostgreSQL
              </span>
            </div>
          </div>

          {/* Métricas Simuladas Aisladas por Tenant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Vendedores en Calle</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {session.usuario.rol === 'SuperAdmin' ? '14 (Todas las Empresas)' : '4 Vendedores'}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Autenticados vía PIN de 4 dígitos
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Zonas Asignadas</span>
                <Compass className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {session.usuario.rol === 'SuperAdmin' ? '32 Zonas' : 'SUR-01, NORTE-02'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Aislamiento por <code className="text-amber-400">tenant_id</code>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Visitas Registradas Hoy</span>
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {session.usuario.rol === 'SuperAdmin' ? '128 Visitas' : '37 Visitas'}
              </div>
              <div className="text-[11px] text-indigo-400 mt-1">
                Catálogo global comercios_master
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Catálogo de Productos</span>
                <Package className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {session.usuario.rol === 'SuperAdmin' ? '450 SKUs' : '28 Productos Activos'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Precios y productos propios del tenant
              </div>
            </div>
          </div>
        </div>
      ) : (
        // VISTA LOGIN CON GOOGLE OAUTH
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Card Izquierda: Login con Google OAuth */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Ingreso de Supervisor / SuperAdmin</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Autenticación centralizada con Google OAuth y resolución automática de Tenant en Supabase.
              </p>
            </div>

            {/* Selector de Cuentas para Probar Flujo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Selecciona la cuenta de Google para simular:
              </label>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmail('francoazzetti')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    selectedEmail === 'francoazzetti'
                      ? 'bg-purple-950/40 border-purple-500 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>francoazzetti@gmail.com</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                        SuperAdmin Global
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Franco Azzetti • Acceso Maestro SaaS
                    </div>
                  </div>
                  <Globe className="w-4 h-4 text-purple-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEmail('supervisor')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    selectedEmail === 'supervisor'
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>supervisor@losandes.com</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold">
                        Supervisor
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Empresa: Distribuidora Los Andes S.A.
                    </div>
                  </div>
                  <Building2 className="w-4 h-4 text-indigo-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEmail('superadmin')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    selectedEmail === 'superadmin'
                      ? 'bg-purple-950/40 border-purple-500 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>admin@saas.com</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold">
                        SuperAdmin
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Permiso Global (tenant_id = NULL)
                    </div>
                  </div>
                  <Globe className="w-4 h-4 text-purple-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEmail('unauthorized')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    selectedEmail === 'unauthorized'
                      ? 'bg-rose-950/40 border-rose-500 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <span>externo@gmail.com</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-semibold">
                        No Autorizado
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Usuario no registrado en la tabla 'usuarios'
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            </div>

            {/* Botón Principal Google Sign In */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleSimulateGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98]"
              >
                {/* Google Icon SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{loading ? 'Validando con Google y Supabase...' : 'Continuar con Google'}</span>
              </button>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Al iniciar sesión, el sistema valida la existencia de la cuenta en la tabla <code className="text-slate-400">usuarios</code>, resuelve el <code className="text-slate-400">tenant_id</code> y redirige al dashboard.
              </p>
            </div>

            {/* Resultado de la Prueba */}
            {resultMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  resultMessage.success
                    ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-800/70 text-rose-200'
                }`}
              >
                {resultMessage.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{resultMessage.text}</span>
              </div>
            )}
          </div>

          {/* Columna Derecha: Explicación Técnica y Código del Flujo */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-indigo-400" />
                Flujo Detallado de Autenticación OAuth
              </h4>

              <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <strong className="text-white">Llamada a Supabase OAuth:</strong>
                  <br />
                  <code className="text-emerald-400 font-mono text-[11px] block mt-1">
                    supabase.auth.signInWithOAuth(&#123; provider: 'google', options: &#123; redirectTo: '/dashboard' &#125; &#125;)
                  </code>
                </li>

                <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <strong className="text-white">Búsqueda de Fila en `usuarios`:</strong>
                  Al retornar el correo de Google, se ejecuta una consulta filtrada:
                  <br />
                  <code className="text-emerald-400 font-mono text-[11px] block mt-1">
                    SELECT * FROM usuarios WHERE email = googleUser.email;
                  </code>
                </li>

                <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <strong className="text-white">Extracción de `tenant_id`:</strong>
                  Se toma el identificador de empresa del usuario (o <code className="text-amber-400">null</code> si es SuperAdmin) y se inyecta en el contexto de sesión.
                </li>

                <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <strong className="text-white">Redirección a `/dashboard`:</strong>
                  Si el rol es <code className="text-indigo-400">Supervisor</code> o <code className="text-purple-400">SuperAdmin</code>, el usuario ingresa al panel. Si el rol fuera <code className="text-amber-400">Vendedor</code>, se le indica que debe ingresar con su PIN móvil.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
