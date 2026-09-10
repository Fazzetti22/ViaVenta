import React from 'react';
import { Database, ShieldCheck, Key, Lock, Globe, Layers, ArrowRight } from 'lucide-react';

export const SchemaInspector: React.FC = () => {
  const tables = [
    {
      name: 'empresas',
      label: 'Tenants (Empresas Aisladas)',
      icon: <Database className="w-4 h-4 text-indigo-400" />,
      rlsMode: 'Aislamiento Estricto por Tenant / SuperAdmin Global',
      badge: 'Tenant Root',
      columns: [
        { name: 'tenant_id', type: 'UUID', pk: true, desc: 'Identificador primario único del tenant' },
        { name: 'nombre_empresa', type: 'TEXT', notNull: true, desc: 'Nombre comercial de la distribuidora' },
        { name: 'activa', type: 'BOOLEAN', defaultVal: 'true', desc: 'Control de suspensión del servicio' },
        { name: 'creado_en', type: 'TIMESTAMPTZ', defaultVal: 'NOW()', desc: 'Marca temporal de alta' },
      ],
    },
    {
      name: 'usuarios',
      label: 'Usuarios (Supervisor, Vendedor, SuperAdmin)',
      icon: <Lock className="w-4 h-4 text-emerald-400" />,
      rlsMode: 'tenant_id = auth.user_tenant_id() | SuperAdmin Global',
      badge: 'Auth Entity',
      columns: [
        { name: 'id_usuario', type: 'UUID', pk: true, desc: 'Identificador único del usuario (Auth)' },
        { name: 'tenant_id', type: 'UUID', fk: 'empresas(tenant_id)', desc: 'Nullable únicamente para SuperAdmin' },
        { name: 'email', type: 'TEXT', unique: true, notNull: true, desc: 'Correo para Google OAuth o Login PIN' },
        { name: 'pin', type: 'VARCHAR(4)', desc: 'PIN numérico de 4 dígitos (solo Vendedor)' },
        { name: 'rol', type: 'TEXT', desc: "'SuperAdmin' | 'Supervisor' | 'Vendedor'" },
        { name: 'nombre_completo', type: 'TEXT', notNull: true, desc: 'Nombre del usuario' },
        { name: 'creado_en', type: 'TIMESTAMPTZ', defaultVal: 'NOW()', desc: 'Fecha de creación' },
      ],
    },
    {
      name: 'comercios_master',
      label: 'Catálogo Global Compartido (Sin tenant_id)',
      icon: <Globe className="w-4 h-4 text-amber-400" />,
      rlsMode: 'Lectura Pública para todo autenticado | Escritura SuperAdmin',
      badge: 'Global Shared',
      columns: [
        { name: 'id_comercio', type: 'UUID', pk: true, desc: 'Identificador único del punto de venta' },
        { name: 'google_place_id', type: 'TEXT', unique: true, desc: 'Referencia global Google Places' },
        { name: 'nombre', type: 'TEXT', notNull: true, desc: 'Nombre comercial del punto de venta' },
        { name: 'categoria', type: 'TEXT', desc: 'Kiosco, Supermercado, Almacén, etc.' },
        { name: 'latitud', type: 'NUMERIC(10,7)', desc: 'Coordenada GPS' },
        { name: 'longitud', type: 'NUMERIC(10,7)', desc: 'Coordenada GPS' },
      ],
    },
    {
      name: 'zonas',
      label: 'Zonas de Ruteo',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      rlsMode: 'tenant_id = auth.user_tenant_id()',
      badge: 'Tenant Scoped',
      columns: [
        { name: 'id_zona', type: 'UUID', pk: true, desc: 'ID único de zona' },
        { name: 'tenant_id', type: 'UUID', fk: 'empresas(tenant_id)', notNull: true, desc: 'Empresa dueña' },
        { name: 'nombre_zona', type: 'TEXT', notNull: true, desc: "Identificador territorial (ej. 'SUR-01')" },
        { name: 'activa', type: 'BOOLEAN', defaultVal: 'true', desc: 'Estado operativo' },
      ],
    },
    {
      name: 'visitas',
      label: 'Check-in y Visitas de Venta en Calle',
      icon: <ArrowRight className="w-4 h-4 text-rose-400" />,
      rlsMode: 'tenant_id = auth.user_tenant_id() AND id_usuario = auth.uid()',
      badge: 'High-Volume Events',
      columns: [
        { name: 'id_visita', type: 'UUID', pk: true, desc: 'Identificador de la visita' },
        { name: 'tenant_id', type: 'UUID', fk: 'empresas(tenant_id)', notNull: true, desc: 'Tenant' },
        { name: 'id_usuario', type: 'UUID', fk: 'usuarios(id_usuario)', notNull: true, desc: 'Vendedor que marcó' },
        { name: 'id_comercio', type: 'UUID', fk: 'comercios_master(id_comercio)', notNull: true, desc: 'Comercio visitado' },
        { name: 'id_zona', type: 'UUID', fk: 'zonas(id_zona)', notNull: true, desc: 'Zona asignada' },
        { name: 'estado_visita', type: 'TEXT', desc: "'Venta'|'Presupuestado'|'Cerrado'|'No atendio'|'Rechazado'|'Otro'" },
        { name: 'latitud_marcado', type: 'NUMERIC(10,7)', desc: 'GPS en momento de visita' },
        { name: 'longitud_marcado', type: 'NUMERIC(10,7)', desc: 'GPS en momento de visita' },
        { name: 'fecha_visita', type: 'TIMESTAMPTZ', defaultVal: 'NOW()', desc: 'Fecha y hora' },
      ],
    },
    {
      name: 'productos',
      label: 'Catálogo de Productos',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      rlsMode: 'tenant_id = auth.user_tenant_id()',
      badge: 'Tenant Scoped',
      columns: [
        { name: 'id_producto', type: 'UUID', pk: true, desc: 'ID de SKU' },
        { name: 'tenant_id', type: 'UUID', fk: 'empresas(tenant_id)', notNull: true, desc: 'Tenant' },
        { name: 'nombre', type: 'TEXT', notNull: true, desc: 'Nombre del producto o pack' },
        { name: 'precio', type: 'NUMERIC(12,2)', notNull: true, desc: 'Precio de lista' },
        { name: 'activo', type: 'BOOLEAN', defaultVal: 'true', desc: 'Disponibilidad para ruteo' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Arquitectura Multi-Tenant y Seguridad RLS</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Aislamiento a nivel de motor de base de datos en PostgreSQL mediante <strong>Row Level Security (RLS)</strong>. Todas las tablas tenant-aware comparten la columna <code className="text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded">tenant_id</code> garantizando que ningún usuario de una empresa pueda leer ni alterar registros de otra empresa, sin costo adicional de bases de datos separadas ($0 USD).
        </p>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {tables.map((tbl) => (
          <div
            key={tbl.name}
            className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="p-4 bg-slate-850/80 border-b border-slate-800 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                    {tbl.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white">public.{tbl.name}</h4>
                    <p className="text-[11px] text-slate-400">{tbl.label}</p>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                  {tbl.badge}
                </span>
              </div>

              {/* RLS Policy Summary */}
              <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 text-[11px] text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tbl.rlsMode}</span>
              </div>

              {/* Columns Table */}
              <div className="divide-y divide-slate-800/60 text-xs">
                {tbl.columns.map((col) => (
                  <div key={col.name} className="p-2.5 px-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {col.pk ? (
                        <Key className="w-3 h-3 text-amber-400 shrink-0" title="Primary Key" />
                      ) : col.fk ? (
                        <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" title="Foreign Key" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-slate-700/60 shrink-0" />
                      )}
                      <span className="font-mono font-medium text-slate-200 truncate">{col.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {col.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>RLS Activo</span>
              <span className="text-emerald-400 font-semibold">PostgreSQL 15</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
