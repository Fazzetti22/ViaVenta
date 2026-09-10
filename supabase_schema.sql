-- ============================================================================
-- VIAVENTA - SCHEMA DE BASE DE DATOS PARA SUPABASE (POSTGRESQL)
-- ============================================================================
-- Instrucciones de instalación:
-- 1. Ve a tu consola de Supabase (https://supabase.com/dashboard)
-- 2. Abre tu proyecto y dirígete a "SQL Editor" en el menú lateral izquierdo.
-- 3. Crea una "New query", pega todo este contenido y presiona "RUN".
-- ============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE EMPRESAS / TENANTS (DISTRIBUIDORAS)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa TEXT NOT NULL,
    cuit TEXT,
    telefono TEXT,
    email_contacto TEXT,
    direccion TEXT,
    activa BOOLEAN DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE USUARIOS (SUPERVISORES Y PREVENTISTAS)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('SuperAdmin', 'Supervisor', 'Vendedor')),
    pin TEXT, -- PIN de 4 dígitos para preventistas (ej. '1234')
    telefono TEXT,
    zona_asignada TEXT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE ZONAS GEOGRÁFICAS
CREATE TABLE IF NOT EXISTS public.zonas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre_zona TEXT NOT NULL,
    descripcion TEXT,
    color_identificador TEXT DEFAULT '#2563EB',
    centroide_lat DOUBLE PRECISION,
    centroide_lng DOUBLE PRECISION,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE COMERCIOS / CLIENTES
CREATE TABLE IF NOT EXISTS public.comercios_master (
    id_comercio UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    telefono TEXT,
    categoria TEXT NOT NULL, -- 'lawyer', 'accounting', 'hardware_store', 'convenience_store', etc.
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    zona_id UUID REFERENCES public.zonas(id) ON DELETE SET NULL,
    vendedor_asignado_id UUID REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE PRODUCTOS / CATÁLOGO
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    precio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    unidad TEXT DEFAULT 'unidad',
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE VISITAS Y PEDIDOS TOMADOS EN CALLE
CREATE TABLE IF NOT EXISTS public.visitas_pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    comercio_id UUID REFERENCES public.comercios_master(id_comercio) ON DELETE SET NULL,
    vendedor_id UUID REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
    comercio_nombre TEXT NOT NULL,
    vendedor_nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    hora_visita TEXT NOT NULL,
    estado_visita TEXT NOT NULL CHECK (estado_visita IN ('visitado_con_pedido', 'visitado_sin_pedido', 'pendiente')),
    motivo_rechazo TEXT,
    total NUMERIC(12, 2) DEFAULT 0.00,
    forma_pago TEXT,
    observaciones TEXT,
    items JSONB DEFAULT '[]'::jsonb, -- Array con [{ id, nombre, cantidad, precio_unitario, subtotal }]
    latitud_registro DOUBLE PRECISION,
    longitud_registro DOUBLE PRECISION,
    sincronizado_en TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDITORÍA DE CONEXIONES Y UBICACIÓN DE PREVENTISTAS
CREATE TABLE IF NOT EXISTS public.vendedor_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendedor_id UUID REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    bateria_porcentaje INTEGER,
    ultima_conexion TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- POLÍTICAS DE ACCESO (ROW LEVEL SECURITY - RLS)
-- ============================================================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercios_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendedor_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública/anónima iniciales (para agilizar conexión cliente PWA y consola):
CREATE POLICY "Acceso total a empresas" ON public.empresas FOR ALL USING (true);
CREATE POLICY "Acceso total a usuarios" ON public.usuarios FOR ALL USING (true);
CREATE POLICY "Acceso total a zonas" ON public.zonas FOR ALL USING (true);
CREATE POLICY "Acceso total a comercios" ON public.comercios_master FOR ALL USING (true);
CREATE POLICY "Acceso total a productos" ON public.productos FOR ALL USING (true);
CREATE POLICY "Acceso total a visitas_pedidos" ON public.visitas_pedidos FOR ALL USING (true);
CREATE POLICY "Acceso total a vendedor_tracking" ON public.vendedor_tracking FOR ALL USING (true);

-- ============================================================================
-- DATOS SEMILLA INICIALES (Para tu primer acceso a producción)
-- ============================================================================

-- Empresa distribuidora inicial
INSERT INTO public.empresas (id, nombre_empresa, cuit, email_contacto, direccion, activa)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Distribuidora Central S.A.',
    '30-71234567-8',
    'contacto@distribuidoracentral.com',
    'Av. Belgrano Sur 1500, Santiago del Estero',
    true
) ON CONFLICT (id) DO NOTHING;

-- Tu usuario SuperAdmin
INSERT INTO public.usuarios (id_usuario, tenant_id, email, nombre_completo, rol, pin, activo)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    NULL,
    'francoazzetti@gmail.com',
    'Franco Azzetti',
    'SuperAdmin',
    NULL,
    true
) ON CONFLICT (email) DO NOTHING;

-- Usuario Preventista de ejemplo
INSERT INTO public.usuarios (id_usuario, tenant_id, email, nombre_completo, rol, pin, telefono, zona_asignada, activo)
VALUES (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '11111111-1111-4111-8111-111111111111',
    'vendedor@distribuidora.com',
    'Juan Pérez',
    'Vendedor',
    '1234',
    '3855123456',
    'Zona Sur - Av. Belgrano',
    true
) ON CONFLICT (email) DO NOTHING;
