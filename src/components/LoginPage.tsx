import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { AuthService } from '../services/authService';
import { useRouter } from '../router';
import { ViaVentaLogo } from './ViaVentaLogo';

export const LoginPage: React.FC = () => {
  const { navigate } = useRouter();

  // Tipo de login: 'vendedor' (PIN) o 'supervisor' (Google / Pass)
  const [modoLogin, setModoLogin] = useState<'vendedor' | 'supervisor'>('vendedor');

  // Estado Vendedor
  const [vendedorEmail, setVendedorEmail] = useState('');
  const [vendedorPin, setVendedorPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Estado Supervisor / SuperAdmin
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados de carga y feedback
  const [loading, setLoading] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // 1. Manejo de Login Vendedor (PIN de 4 dígitos)
  const handleSubmitVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    if (!vendedorEmail.trim()) {
      setMensajeError('Por favor, ingresa tu correo electrónico corporativo.');
      return;
    }

    if (!/^\d{4}$/.test(vendedorPin.trim())) {
      setMensajeError('El PIN debe contener exactamente 4 dígitos numéricos.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.loginVendedorPin(vendedorEmail, vendedorPin);
      if (res.success && res.session) {
        setMensajeExito('Acceso autorizado. Cargando tu ruta de hoy...');
        setTimeout(() => {
          navigate('/app');
        }, 600);
      } else {
        setMensajeError(res.message || 'No fue posible iniciar sesión. Verifica tu correo y PIN.');
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Manejo de Login Google OAuth para Supervisor / SuperAdmin
  const handleGoogleOAuth = async (emailOverride?: string) => {
    setMensajeError(null);
    setMensajeExito(null);

    const emailToUse = (emailOverride || supervisorEmail).trim().toLowerCase();
    if (!emailToUse) {
      setMensajeError('Por favor ingresa tu correo electrónico corporativo abajo para continuar.');
      return;
    }

    setLoading(true);

    try {
      const res = await AuthService.processGoogleOAuthCallback(emailToUse);
      if (res.success && res.session) {
        setMensajeExito(`¡Bienvenido ${res.session.usuario.nombre_completo}!`);
        setTimeout(() => {
          if (res.session?.usuario.rol === 'SuperAdmin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 600);
      } else {
        setMensajeError(res.message || 'Error al autenticar mediante Google OAuth.');
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error de conexión con Google Identity Services.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Manejo de Login con Correo y Contraseña
  const handleSubmitSupervisorEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    if (!supervisorEmail.trim()) {
      setMensajeError('Por favor ingresa tu correo corporativo.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.loginWithPassword(supervisorEmail, supervisorPassword);
      if (res.success && res.session) {
        setMensajeExito(`¡Bienvenido ${res.session.usuario.nombre_completo}!`);
        setTimeout(() => {
          if (res.session?.usuario.rol === 'SuperAdmin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 600);
      } else {
        setMensajeError(res.message || 'Credenciales incorrectas.');
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-blue-600 selection:text-white">
      {/* Brand Header con Logotipo Oficial ViaVenta */}
      <div className="text-center mb-8 relative z-10 flex flex-col items-center">
        <ViaVentaLogo size="lg" theme="light" showTagline={false} className="mb-2" />
        <p className="text-sm font-semibold text-slate-700 mt-1">
          Ruteo inteligente y ventas en calle
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs relative z-10">
        {/* Segmented Switch */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setModoLogin('vendedor');
              setMensajeError(null);
              setMensajeExito(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${
              modoLogin === 'vendedor'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preventista (PIN)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModoLogin('supervisor');
              setMensajeError(null);
              setMensajeExito(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${
              modoLogin === 'supervisor'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Supervisor / Admin</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {mensajeError && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{mensajeError}</span>
          </div>
        )}

        {mensajeExito && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* FORMA 1: LOGIN VENDEDOR (PIN) */}
        {modoLogin === 'vendedor' && (
          <form onSubmit={handleSubmitVendedor} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1.5">
                Correo Electrónico del Preventista
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={vendedorEmail}
                  onChange={(e) => setVendedorEmail(e.target.value)}
                  placeholder="vendedor@empresa.com"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1.5 flex items-center justify-between">
                <span>PIN Numérico (4 dígitos)</span>
                <span className="text-[11px] text-slate-500 font-normal">Sesión Móvil 3h</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  inputMode="numeric"
                  value={vendedorPin}
                  onChange={(e) => setVendedorPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-900 placeholder-slate-400 font-mono tracking-widest focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar a Ruta del Día</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORMA 2: LOGIN SUPERVISOR & SUPERADMIN */}
        {modoLogin === 'supervisor' && (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoogleOAuth()}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase tracking-wider font-medium">o con contraseña</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleSubmitSupervisorEmail} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Correo Electrónico Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={supervisorEmail}
                    onChange={(e) => setSupervisorEmail(e.target.value)}
                    placeholder="supervisor@empresa.com"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={supervisorPassword}
                    onChange={(e) => setSupervisorPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Iniciando sesión...</span>
                ) : (
                  <>
                    <span>Entrar al Panel de Control</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <p>ViaVenta • Sistema de Gestión y Ruteo Comercial B2B</p>
      </div>
    </div>
  );
};
