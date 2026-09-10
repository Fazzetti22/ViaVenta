// Exporta el script SQL para visualización, copiado rápido y ejecución directa en Supabase
export const SUPABASE_SCHEMA_SQL = `-- =============================================================================
-- MÓDULO 1: INFRAESTRUCTURA BASE, MULTI-TENANCY RLS Y AUTENTICACIÓN
-- Arquitectura Cloud $0 USD (Supabase / PostgreSQL)
-- =============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. TABLAS BASE
-- =============================================================================

-- 2.1 EMPRESAS (Tenants aislados)
CREATE TABLE IF NOT EXISTS public.empresas (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2.2 USUARIOS (Multi-tenant con excepción SuperAdmin)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.empresas(tenant_id) ON DELETE RESTRICT,
    email TEXT UNIQUE NOT NULL,
    pin VARCHAR(4) NULL, -- Solo para rol 'Vendedor'
    rol TEXT NOT NULL CHECK (rol IN ('SuperAdmin', 'Supervisor', 'Vendedor')),
    nombre_completo TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_superadmin_tenant CHECK (
        (rol = 'SuperAdmin' AND tenant_id IS NULL) OR
        (rol IN ('Supervisor', 'Vendedor') AND tenant_id IS NOT NULL)
    ),
    CONSTRAINT chk_vendedor_pin CHECK (
        (rol = 'Vendedor' AND pin IS NOT NULL AND pin ~ '^[0-9]{4}$') OR
        (rol IN ('SuperAdmin', 'Supervisor'))
    )
);

-- 2.3 COMERCIOS_MASTER (Catálogo global compartido - Sin tenant_id)
CREATE TABLE IF NOT EXISTS public.comercios_master (
    id_comercio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_place_id TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT,
    latitud NUMERIC(10, 7) NOT NULL,
    longitud NUMERIC(10, 7) NOT NULL
);

-- 2.4 ZONAS (Territorios de ruteo por tenant)
CREATE TABLE IF NOT EXISTS public.zonas (
    id_zona UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.empresas(tenant_id) ON DELETE CASCADE,
    nombre_zona TEXT NOT NULL, -- ej. 'SUR-01'
    activa BOOLEAN NOT NULL DEFAULT true
);

-- 2.5 PRODUCTOS (Catálogo por tenant)
CREATE TABLE IF NOT EXISTS public.productos (
    id_producto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.empresas(tenant_id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
    activo BOOLEAN NOT NULL DEFAULT true
);

-- 2.6 VISITAS (Check-in de vendedores en comercios por zona)
CREATE TABLE IF NOT EXISTS public.visitas (
    id_visita UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.empresas(tenant_id) ON DELETE CASCADE,
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE RESTRICT,
    id_comercio UUID NOT NULL REFERENCES public.comercios_master(id_comercio) ON DELETE RESTRICT,
    id_zona UUID NOT NULL REFERENCES public.zonas(id_zona) ON DELETE RESTRICT,
    estado_visita TEXT NOT NULL CHECK (
        estado_visita IN ('Venta', 'Presupuestado', 'Cerrado', 'No atendio', 'Rechazado', 'Otro')
    ),
    latitud_marcado NUMERIC(10, 7) NOT NULL,
    longitud_marcado NUMERIC(10, 7) NOT NULL,
    fecha_visita TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. ÍNDICES DE RENDIMIENTO (Optimización para Capa Free de PostgreSQL)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_id ON public.usuarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_comercios_place_id ON public.comercios_master(google_place_id);
CREATE INDEX IF NOT EXISTS idx_zonas_tenant_id ON public.zonas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_tenant_id ON public.productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitas_tenant_id ON public.visitas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitas_usuario_fecha ON public.visitas(id_usuario, fecha_visita DESC);
CREATE INDEX IF NOT EXISTS idx_visitas_zona ON public.visitas(id_zona);

-- =============================================================================
-- 4. FUNCIONES HELPER PARA ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Obtiene el tenant_id del usuario conectado
CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::UUID,
        (SELECT tenant_id FROM public.usuarios WHERE id_usuario = auth.uid())
    );
$$;

-- Verifica si el usuario conectado es SuperAdmin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT rol = 'SuperAdmin' FROM public.usuarios WHERE id_usuario = auth.uid()),
        false
    );
$$;

-- Obtiene el rol del usuario conectado
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol FROM public.usuarios WHERE id_usuario = auth.uid();
$$;

-- =============================================================================
-- 5. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercios_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. POLÍTICAS RLS (Row Level Security)
-- =============================================================================

-- 6.1 EMPRESAS
CREATE POLICY "Empresas: SuperAdmin acceso total"
    ON public.empresas FOR ALL TO authenticated
    USING (auth.is_super_admin()) WITH CHECK (auth.is_super_admin());

CREATE POLICY "Empresas: Consulta de la propia empresa"
    ON public.empresas FOR SELECT TO authenticated
    USING (tenant_id = auth.user_tenant_id());

-- 6.2 USUARIOS
CREATE POLICY "Usuarios: SuperAdmin acceso total"
    ON public.usuarios FOR ALL TO authenticated
    USING (auth.is_super_admin()) WITH CHECK (auth.is_super_admin());

CREATE POLICY "Usuarios: Consulta miembros del mismo tenant"
    ON public.usuarios FOR SELECT TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Usuarios: Inserción por supervisores del tenant"
    ON public.usuarios FOR INSERT TO authenticated
    WITH CHECK (tenant_id = auth.user_tenant_id() AND auth.user_role() = 'Supervisor');

CREATE POLICY "Usuarios: Actualización por usuario o supervisor"
    ON public.usuarios FOR UPDATE TO authenticated
    USING (tenant_id = auth.user_tenant_id() AND (id_usuario = auth.uid() OR auth.user_role() = 'Supervisor'))
    WITH CHECK (tenant_id = auth.user_tenant_id());

-- 6.3 COMERCIOS_MASTER
CREATE POLICY "Comercios Master: Lectura global para todo usuario autenticado"
    ON public.comercios_master FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Comercios Master: SuperAdmin gestiona catálogo global"
    ON public.comercios_master FOR ALL TO authenticated
    USING (auth.is_super_admin()) WITH CHECK (auth.is_super_admin());

-- 6.4 ZONAS
CREATE POLICY "Zonas: SuperAdmin acceso total"
    ON public.zonas FOR ALL TO authenticated
    USING (auth.is_super_admin()) WITH CHECK (auth.is_super_admin());

CREATE POLICY "Zonas: Aislamiento por tenant (Lectura)"
    ON public.zonas FOR SELECT TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Zonas: Aislamiento por tenant (Inserción)"
    ON public.zonas FOR INSERT TO authenticated
    WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Zonas: Aislamiento por tenant (Modificación)"
    ON public.zonas FOR UPDATE TO authenticated
    USING (tenant_id = auth.user_tenant_id()) WITH CHECK (tenant_id = auth.user_tenant_id());

-- 6.5 PRODUCTOS
CREATE POLICY "Productos: SuperAdmin acceso total"
    ON public.productos FOR ALL TO authenticated
    USING (auth.is_super_admin()) WITH CHECK (auth.is_super_admin());

CREATE POLICY "Productos: Aislamiento por tenant (Lectura)"
    ON public.productos FOR SELECT TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Productos: Aislamiento por tenant (Inserción)"
    ON public.productos FOR INSERT TO authenticated
    WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Productos: Aislamiento por tenant (Modificación)"
    ON public.productos FOR UPDATE TO authenticated
    USING (tenant_id = auth.user_tenant_id()) WITH CHECK (tenant_id = auth.user_tenant_id());

-- 6.6 VISITAS
CREATE POLICY "Visitas: SuperAdmin acceso total"
    ON public.visitas FOR ALL TO authenticated
    USING (auth.is_super_admin()) WITH CHECK (auth.is_super_admin());

CREATE POLICY "Visitas: Aislamiento por tenant (Lectura)"
    ON public.visitas FOR SELECT TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Visitas: Aislamiento por tenant (Inserción)"
    ON public.visitas FOR INSERT TO authenticated
    WITH CHECK (tenant_id = auth.user_tenant_id() AND id_usuario = auth.uid());

CREATE POLICY "Visitas: Actualización por vendedor o supervisor"
    ON public.visitas FOR UPDATE TO authenticated
    USING (tenant_id = auth.user_tenant_id() AND (id_usuario = auth.uid() OR auth.user_role() IN ('Supervisor', 'SuperAdmin')))
    WITH CHECK (tenant_id = auth.user_tenant_id());

-- =============================================================================
-- 7. FUNCIÓN RPC: LOGIN RÁPIDO VENDEDOR (PIN de 4 dígitos)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.login_vendedor_pin(
    p_email TEXT,
    p_pin VARCHAR(4)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario RECORD;
    v_empresa RECORD;
BEGIN
    IF p_pin !~ '^[0-9]{4}$' THEN
        RETURN jsonb_build_object('success', false, 'message', 'El PIN debe contener 4 dígitos.');
    END IF;

    SELECT u.id_usuario, u.tenant_id, u.email, u.pin, u.rol, u.nombre_completo, u.creado_en
    INTO v_usuario
    FROM public.usuarios u
    WHERE LOWER(u.email) = LOWER(p_email) AND u.rol = 'Vendedor';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credenciales inválidas o no es vendedor.');
    END IF;

    IF v_usuario.pin <> p_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'PIN incorrecto.');
    END IF;

    SELECT e.tenant_id, e.nombre_empresa, e.activa
    INTO v_empresa
    FROM public.empresas e
    WHERE e.tenant_id = v_usuario.tenant_id;

    IF NOT FOUND OR v_empresa.activa = false THEN
        RETURN jsonb_build_object('success', false, 'message', 'Empresa inactiva o suspendida.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Autenticación exitosa',
        'session', jsonb_build_object(
            'id_usuario', v_usuario.id_usuario,
            'tenant_id', v_usuario.tenant_id,
            'nombre_empresa', v_empresa.nombre_empresa,
            'email', v_usuario.email,
            'nombre_completo', v_usuario.nombre_completo,
            'rol', v_usuario.rol,
            'expires_in_seconds', 10800, -- 3 Horas
            'token', encode(gen_random_bytes(32), 'hex')
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_vendedor_pin(TEXT, VARCHAR(4)) TO anon, authenticated;
`;
