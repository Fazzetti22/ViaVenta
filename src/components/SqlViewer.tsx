import React, { useState } from 'react';
import { SUPABASE_SCHEMA_SQL } from '../sql/supabase_schema';
import { Copy, Check, Database, ShieldCheck, Zap, Layers, FileCode } from 'lucide-react';

export const SqlViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [filterSection, setFilterSection] = useState<'all' | 'tables' | 'rls' | 'rpc'>('all');

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div id="sql-viewer-container" className="space-y-6">
      {/* Top Banner with Architecture Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Supabase / PostgreSQL Free Tier ($0 USD)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Row Level Security (RLS)
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Script DDL SQL Completo para Supabase
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Incluye las 6 tablas con aislamiento multi-tenant por <code className="text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">tenant_id</code>,
              catálogo global compartido (<code className="text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">comercios_master</code>),
              funciones helper <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">auth.user_tenant_id()</code> y función RPC de login con PIN de 4 dígitos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              id="copy-sql-button"
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-900/40 shadow-lg'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡Script Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white" />
                  <span>Copiar Script SQL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">6 Tablas Compartidas</div>
              <div className="text-xs text-slate-400">empresas, usuarios, comercios_master, zonas, visitas, productos</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">Aislamiento RLS Estricto</div>
              <div className="text-xs text-slate-400">auth.user_tenant_id() + Excepción SuperAdmin Global</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">Login RPC con PIN</div>
              <div className="text-xs text-slate-400">login_vendedor_pin() con validación y sesión 3h</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">Índices Optimizados</div>
              <div className="text-xs text-slate-400">Zero-cost scans sobre tenant_id y claves externas</div>
            </div>
          </div>
        </div>
      </div>

      {/* SQL Editor Frame */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Editor Top Bar */}
        <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-medium text-slate-300">supabase_schema.sql</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              PostgreSQL 15+ / Supabase
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-slate-950">
          <pre className="whitespace-pre overflow-x-auto selection:bg-indigo-900 selection:text-white">
            {SUPABASE_SCHEMA_SQL}
          </pre>
        </div>
      </div>
    </div>
  );
};
