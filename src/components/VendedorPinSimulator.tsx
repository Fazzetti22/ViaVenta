import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { sessionManager, SESSION_DURATION_SECONDS } from '../services/sessionManager';
import { AuthSession } from '../types/auth';
import { 
  Smartphone, 
  KeyRound, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  MapPin, 
  ShoppingBag, 
  Zap, 
  Building2,
  Delete,
  ShieldCheck
} from 'lucide-react';

interface VendedorPinSimulatorProps {
  onOpenPwa?: () => void;
}

export const VendedorPinSimulator: React.FC<VendedorPinSimulatorProps> = ({ onOpenPwa }) => {
  const [email, setEmail] = useState('vendedor@losandes.com');
  const [pin, setPin] = useState('');
  const [session, setSession] = useState<AuthSession | null>(sessionManager.getSession());
  const [timeRemaining, setTimeRemaining] = useState<number>(sessionManager.getTimeRemainingSeconds());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastActivityNotice, setLastActivityNotice] = useState<string | null>(null);

  // Sincronizar estado de sesión y temporizador
  useEffect(() => {
    const unsubSession = sessionManager.onSessionChange((current) => {
      setSession(current);
      if (current) {
        setTimeRemaining(sessionManager.getTimeRemainingSeconds());
      }
    });

    const unsubExpired = sessionManager.onSessionExpired(() => {
      setErrorMessage('Tu sesión de 3 horas ha expirado por inactividad. Por favor, reingresa con tu PIN.');
      setPin('');
    });

    const interval = setInterval(() => {
      if (sessionManager.getSession()) {
        setTimeRemaining(sessionManager.getTimeRemainingSeconds());
      }
    }, 1000);

    return () => {
      unsubSession();
      unsubExpired();
      clearInterval(interval);
    };
  }, []);

  const handleKeypadPress = (val: string) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-login al completar 4 dígitos si hay email
        attemptLogin(email, newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClearPin = () => {
    setPin('');
  };

  const attemptLogin = async (loginEmail: string, loginPin: string) => {
    setLoading(true);
    setErrorMessage(null);
    const result = await AuthService.loginVendedorPin(loginEmail, loginPin);
    setLoading(false);

    if (result.success && result.session) {
      setSession(result.session);
      setPin('');
      setLastActivityNotice('Sesión iniciada con éxito. Temporizador activado en 3 horas.');
    } else {
      setErrorMessage(result.message);
      setPin('');
    }
  };

  const handleSimulateAction = (actionName: string) => {
    sessionManager.recordActivity(true);
    setTimeRemaining(sessionManager.getTimeRemainingSeconds());
    setLastActivityNotice(`Acción registrada: "${actionName}". Temporizador renovado a 3 horas (10,800s).`);
    setTimeout(() => {
      setLastActivityNotice(null);
    }, 4000);
  };

  const handleExpireSessionNow = () => {
    sessionManager.simulateExpiration();
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setPin('');
    setLastActivityNotice(null);
  };

  // Formatear segundos a HH:MM:SS
  const formatSeconds = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const percentageRemaining = Math.max(0, Math.min(100, (timeRemaining / SESSION_DURATION_SECONDS) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Columna Izquierda: Smartphone Mockup / Pantalla Vendedor PWA */}
      <div className="lg:col-span-5 flex justify-center">
        <div className="w-full max-w-sm bg-slate-950 border-4 border-slate-800 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden">
          {/* Mockup Notch */}
          <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto mb-3 flex items-center justify-center">
            <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
          </div>

          {/* Screen Content */}
          <div className="bg-slate-900 rounded-2xl p-5 min-h-[520px] flex flex-col justify-between border border-slate-800/80">
            {session ? (
              // VISTA VENDEDOR AUTENTICADO
              <div className="space-y-4">
                {/* Header Vendedor */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                      {session.usuario.nombre_completo.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{session.usuario.nombre_completo}</div>
                      <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Vendedor Activo
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Tenant Badge */}
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3 h-3 text-indigo-400" />
                    Empresa / Tenant Asignado
                  </div>
                  <div className="text-xs font-bold text-white">
                    {session.nombre_empresa || 'Distribuidora Los Andes S.A.'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                    ID: {session.tenant_id}
                  </div>
                </div>

                {/* Reloj de Sesión Deslizante (3 Horas) */}
                <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 rounded-xl p-3.5 border border-indigo-500/30 shadow-inner">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-indigo-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Sesión Deslizante (3 Horas)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">10,800s</span>
                  </div>

                  <div className="text-2xl font-mono font-extrabold text-white text-center py-1 tracking-wider">
                    {formatSeconds(timeRemaining)}
                  </div>

                  {/* Barra de progreso de sesión */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        timeRemaining > 3600
                          ? 'bg-emerald-500'
                          : timeRemaining > 900
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${percentageRemaining}%` }}
                    ></div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center mt-2 leading-tight">
                    Cada acción en calle renueva el contador silenciosamente a 3 horas.
                  </p>
                </div>

                {/* Acciones de Vendedor (Simulan la actividad en calle) */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-slate-300">Acciones de Calle (Renuevan Sesión):</div>

                  <button
                    onClick={() => handleSimulateAction('Check-in en Almacén El Centenario')}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium border border-slate-700/60 transition-all active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Marcar Check-in Visita
                    </span>
                    <Zap className="w-3 h-3 text-amber-400" />
                  </button>

                  <button
                    onClick={() => handleSimulateAction('Registrar Pedido Preventa $18.500')}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium border border-slate-700/60 transition-all active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                      Registrar Venta / Pedido
                    </span>
                    <Zap className="w-3 h-3 text-amber-400" />
                  </button>

                  <button
                    onClick={() => handleSimulateAction('Consulta Catálogo de Productos')}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium border border-slate-700/60 transition-all active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                      Sincronizar Zonas y Productos
                    </span>
                    <Zap className="w-3 h-3 text-amber-400" />
                  </button>

                  {onOpenPwa && (
                    <button
                      onClick={onOpenPwa}
                      className="w-full mt-3 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Abrir PWA Móvil del Vendedor (Módulo 3)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // PANTALLA DE LOGIN CON PIN (4 DÍGITOS)
              <div className="flex flex-col justify-between h-full space-y-4">
                <div>
                  {/* Top Brand */}
                  <div className="text-center pt-2">
                    <div className="inline-flex p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white">Ingreso de Vendedor</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Acceso PWA Móvil con PIN de 4 dígitos</p>
                  </div>

                  {/* Email Input */}
                  <div className="mt-4">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vendedor@empresa.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* PIN Display Dots */}
                  <div className="mt-4">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center block mb-2">
                      Ingresa tu PIN de 4 dígitos
                    </label>
                    <div className="flex justify-center gap-3">
                      {[0, 1, 2, 3].map((idx) => {
                        const isFilled = pin.length > idx;
                        return (
                          <div
                            key={idx}
                            className={`w-4 h-4 rounded-full transition-all duration-200 ${
                              isFilled
                                ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/50'
                                : 'bg-slate-800 border border-slate-700'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="bg-rose-950/50 border border-rose-800/80 rounded-lg p-2 text-[11px] text-rose-300 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Tactile Keypad */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-lg rounded-xl border border-slate-700/60 flex items-center justify-center active:scale-95 transition-all"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearPin}
                    className="h-12 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs rounded-xl border border-slate-800 flex items-center justify-center active:scale-95 transition-all"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-lg rounded-xl border border-slate-700/60 flex items-center justify-center active:scale-95 transition-all"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-12 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Panel de Diagnóstico y Explicación del Mecanismo */}
      <div className="lg:col-span-7 space-y-6">
        {/* Banner Informativo de Validación */}
        {lastActivityNotice && (
          <div className="bg-emerald-950/40 border border-emerald-800/70 rounded-xl p-4 text-emerald-200 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-emerald-300">Renovación Silenciosa (Sliding Window) Activa</div>
              <div className="text-emerald-200/90 mt-0.5">{lastActivityNotice}</div>
            </div>
          </div>
        )}

        {/* Card: Especificación de la Lógica del Vendedor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Comportamiento Específico del Login Vendedor</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <strong className="text-white block mb-1">1. Autenticación con Correo + PIN de 4 dígitos:</strong>
              El vendedor ingresa su <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">email</code> y su <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">pin</code>. La función PostgreSQL <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">login_vendedor_pin</code> valida la combinación, corrobora que la empresa esté activa y devuelve el token de sesión.
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <strong className="text-white block mb-1">2. Persistencia Estricta de 3 Horas (10,800 Segundos):</strong>
              La sesión se almacena localmente en <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">LocalStorage</code> con una marca de tiempo de expiración exacta:
              <br />
              <code className="text-emerald-400 block mt-1 bg-slate-900 p-1.5 rounded font-mono text-[11px]">
                expiresAt = Date.now() + 10800 * 1000
              </code>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <strong className="text-white block mb-1">3. Renovación Silenciosa (Sliding Session):</strong>
              Cada interacción en la app móvil (tocar la pantalla, marcar visita, cambiar de vista o registrar una venta) ejecuta <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">sessionManager.recordActivity()</code>, lo que reinicia la ventana de tiempo a 3 horas completas desde ese instante exacto.
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <strong className="text-white block mb-1">4. Expiración Automática por Inactividad:</strong>
              Si transcurren 3 horas consecutivas sin interacción alguna, la sesión se destruye automáticamente y la aplicación redirige de inmediato a la pantalla de ingreso con PIN.
            </div>
          </div>

          {/* Botones de Control de Prueba */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEmail('vendedor@losandes.com');
                setPin('1234');
                attemptLogin('vendedor@losandes.com', '1234');
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
            >
              Probar Vendedor de Ejemplo (PIN 1234)
            </button>

            {session && (
              <button
                onClick={handleExpireSessionNow}
                className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                Simular Inactividad de 3 Horas (Forzar Expiración)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
