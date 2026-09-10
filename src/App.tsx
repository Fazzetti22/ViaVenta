import React, { useState, useEffect } from 'react';
import { RouterProvider, useRouter } from './router';
import { LoginPage } from './components/LoginPage';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { VendedorPwaMobile } from './components/VendedorPwaMobile';
import { SqlViewer } from './components/SqlViewer';
import { SchemaInspector } from './components/SchemaInspector';
import { sessionManager } from './services/sessionManager';
import { AuthSession } from './types/auth';

function MainRouter() {
  const { currentPath, navigate } = useRouter();
  const [session, setSession] = useState<AuthSession | null>(sessionManager.getSession());

  useEffect(() => {
    const unsub = sessionManager.onSessionChange((curr) => {
      setSession(curr);
    });
    return () => unsub();
  }, []);

  // 1. RUTA /login: Formulario de inicio de sesión Vendedor (PIN) o Supervisor/Admin (Google/Pass)
  if (currentPath === '/login') {
    return <LoginPage />;
  }

  // 2. RUTA /admin: Panel exclusivo de Super Admin
  if (currentPath === '/admin') {
    if (!session) {
      return <LoginPage />;
    }
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <SuperAdminPanel />
      </div>
    );
  }

  // 3. RUTA /dashboard: Panel exclusivo de Supervisor y SuperAdmin
  if (currentPath === '/dashboard') {
    if (!session) {
      return <LoginPage />;
    }
    if (session.usuario.rol === 'Vendedor') {
      return <VendedorPwaMobile />;
    }
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <SupervisorDashboard />
      </div>
    );
  }

  // 4. RUTA /app: PWA Móvil del Vendedor a pantalla completa
  if (currentPath === '/app') {
    if (!session) {
      return <LoginPage />;
    }
    return <VendedorPwaMobile />;
  }

  // Rutas técnicas auxiliares de DDL y Schemas para inspección directa por URL
  if (currentPath === '/sql') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">Esquema SQL PostgreSQL / Supabase</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium underline cursor-pointer"
            >
              Volver al Dashboard
            </button>
          </div>
          <SqlViewer />
        </div>
      </div>
    );
  }

  if (currentPath === '/schema') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">Inspección de Tablas Relacionales</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium underline cursor-pointer"
            >
              Volver al Dashboard
            </button>
          </div>
          <SchemaInspector />
        </div>
      </div>
    );
  }

  // 5. RUTA RAÍZ (/):
  // Si no hay sesión, muestra /login
  // Si hay sesión:
  // - Vendedor -> /app (PWA Preventista)
  // - Supervisor -> /dashboard
  // - SuperAdmin -> /admin
  if (!session) {
    return <LoginPage />;
  }

  if (session.usuario.rol === 'SuperAdmin' || session.usuario.email.toLowerCase() === 'francoazzetti@gmail.com') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <SuperAdminPanel />
      </div>
    );
  }

  if (session.usuario.rol === 'Supervisor') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <SupervisorDashboard />
      </div>
    );
  }

  // Por defecto si es Vendedor
  return <VendedorPwaMobile />;
}

export default function App() {
  return (
    <RouterProvider>
      <MainRouter />
    </RouterProvider>
  );
}
