-- =============================================================================
-- MÓDULO 1: INFRAESTRUCTURA BASE, MULTI-TENANCY RLS Y AUTENTICACIÓN
-- Arquitectura Cloud $0 USD (Supabase / PostgreSQL)
-- =============================================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpieza preventiva para entornos de desarrollo/migración controlada
-- DROP TABLE IF EXISTS public.visitas CASCADE;
-- DROP TABLE IF EXISTS public.productos CASCADE;
-- DROP TABLE IF EXISTS public.zonas CASCADE;
-- DROP TABLE IF EXISTS public.comercios_master CASCADE;
-- DROP TABLE IF EXISTS public.usuarios CASCADE;
-- DROP TABLE IF EXISTS public.empresas CASCADE;

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
    
    -- Restricción de integridad:
    -- Solo SuperAdmin puede tener tenant_id NULL
    -- Vendedor debe poseer PIN de 4 dígitos numéricos
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
-- 3. ÍNDICES DE RENDIMIENTO ($0 Optimization: Evita table scans en capas free)
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

-- Obtiene el tenant_id del usuario autenticado (auth.uid())
-- Primero verifica el JWT claim inyectado; como fallback seguro consulta public.usuarios
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

-- Determina si el usuario actual es SuperAdmin
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

-- Obtiene el rol del usuario autenticado
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
-- Regla General: tenant_id = auth.user_tenant_id()
-- Excepción: SuperAdmin tiene acceso global
-- Excepción: comercios_master es de lectura pública para autenticados
-- =============================================================================

-- 6.1 POLÍTICAS: EMPRESAS
CREATE POLICY "Empresas: SuperAdmin acceso total"
    ON public.empresas
    FOR ALL
    TO authenticated
    USING (auth.is_super_admin())
    WITH CHECK (auth.is_super_admin());

CREATE POLICY "Empresas: Los miembros pueden consultar su propia empresa"
    ON public.empresas
    FOR SELECT
    TO authenticated
    USING (tenant_id = auth.user_tenant_id());

-- 6.2 POLÍTICAS: USUARIOS
CREATE POLICY "Usuarios: SuperAdmin acceso total"
    ON public.usuarios
    FOR ALL
    TO authenticated
    USING (auth.is_super_admin())
    WITH CHECK (auth.is_super_admin());

CREATE POLICY "Usuarios: Consulta de miembros del mismo tenant"
    ON public.usuarios
    FOR SELECT
    TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Usuarios: Inserción restringida a supervisores del mismo tenant"
    ON public.usuarios
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = auth.user_tenant_id() AND
        auth.user_role() = 'Supervisor'
    );

CREATE POLICY "Usuarios: Actualización del propio perfil o supervisor"
    ON public.usuarios
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = auth.user_tenant_id() AND
        (id_usuario = auth.uid() OR auth.user_role() = 'Supervisor')
    )
    WITH CHECK (
        tenant_id = auth.user_tenant_id()
    );

-- 6.3 POLÍTICAS: COMERCIOS_MASTER (Catálogo Global)
-- Lectura pública para cualquier usuario autenticado de cualquier tenant
CREATE POLICY "Comercios Master: Lectura global para todo usuario autenticado"
    ON public.comercios_master
    FOR SELECT
    TO authenticated
    USING (true);

-- Solo SuperAdmin o procesos autorizados pueden insertar o alterar el catálogo maestro
CREATE POLICY "Comercios Master: SuperAdmin gestiona catálogo global"
    ON public.comercios_master
    FOR ALL
    TO authenticated
    USING (auth.is_super_admin())
    WITH CHECK (auth.is_super_admin());

-- 6.4 POLÍTICAS: ZONAS
CREATE POLICY "Zonas: SuperAdmin acceso total"
    ON public.zonas
    FOR ALL
    TO authenticated
    USING (auth.is_super_admin())
    WITH CHECK (auth.is_super_admin());

CREATE POLICY "Zonas: Aislamiento estricto por tenant (Lectura)"
    ON public.zonas
    FOR SELECT
    TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Zonas: Aislamiento estricto por tenant (Inserción)"
    ON public.zonas
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Zonas: Aislamiento estricto por tenant (Modificación)"
    ON public.zonas
    FOR UPDATE
    TO authenticated
    USING (tenant_id = auth.user_tenant_id())
    WITH CHECK (tenant_id = auth.user_tenant_id());

-- 6.5 POLÍTICAS: PRODUCTOS
CREATE POLICY "Productos: SuperAdmin acceso total"
    ON public.productos
    FOR ALL
    TO authenticated
    USING (auth.is_super_admin())
    WITH CHECK (auth.is_super_admin());

CREATE POLICY "Productos: Aislamiento estricto por tenant (Lectura)"
    ON public.productos
    FOR SELECT
    TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Productos: Aislamiento estricto por tenant (Inserción)"
    ON public.productos
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "Productos: Aislamiento estricto por tenant (Modificación)"
    ON public.productos
    FOR UPDATE
    TO authenticated
    USING (tenant_id = auth.user_tenant_id())
    WITH CHECK (tenant_id = auth.user_tenant_id());

-- 6.6 POLÍTICAS: VISITAS
CREATE POLICY "Visitas: SuperAdmin acceso total"
    ON public.visitas
    FOR ALL
    TO authenticated
    USING (auth.is_super_admin())
    WITH CHECK (auth.is_super_admin());

CREATE POLICY "Visitas: Aislamiento estricto por tenant (Lectura)"
    ON public.visitas
    FOR SELECT
    TO authenticated
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "Visitas: Aislamiento estricto por tenant (Inserción)"
    ON public.visitas
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = auth.user_tenant_id() AND
        id_usuario = auth.uid()
    );

CREATE POLICY "Visitas: Actualización por el mismo vendedor o supervisor"
    ON public.visitas
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = auth.user_tenant_id() AND
        (id_usuario = auth.uid() OR auth.user_role() IN ('Supervisor', 'SuperAdmin'))
    )
    WITH CHECK (tenant_id = auth.user_tenant_id());

-- =============================================================================
-- 7. FUNCIÓN RPC PARA LOGIN RÁPIDO VENDEDOR (Email + PIN de 4 dígitos)
-- Devuelve información del usuario, tenant_id y datos para sesión de 3 horas
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
    v_response JSONB;
BEGIN
    -- 1. Validar formato de PIN de 4 dígitos
    IF p_pin !~ '^[0-9]{4}$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'El PIN debe ser exactamente de 4 dígitos numéricos.'
        );
    END IF;

    -- 2. Buscar usuario con rol Vendedor y correo correspondiente
    SELECT u.id_usuario, u.tenant_id, u.email, u.pin, u.rol, u.nombre_completo, u.creado_en
    INTO v_usuario
    FROM public.usuarios u
    WHERE LOWER(u.email) = LOWER(p_email)
      AND u.rol = 'Vendedor';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Credenciales inválidas o el usuario no tiene rol de Vendedor.'
        );
    END IF;

    -- 3. Comparar PIN
    IF v_usuario.pin <> p_pin THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'PIN incorrecto. Intente nuevamente.'
        );
    END IF;

    -- 4. Validar que la empresa (tenant) esté activa
    SELECT e.tenant_id, e.nombre_empresa, e.activa
    INTO v_empresa
    FROM public.empresas e
    WHERE e.tenant_id = v_usuario.tenant_id;

    IF NOT FOUND OR v_empresa.activa = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'La empresa asociada se encuentra inactiva o suspendida.'
        );
    END IF;

    -- 5. Generar payload de sesión (expiración estricta de 3 horas = 10,800 segundos)
    v_response := jsonb_build_object(
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

    RETURN v_response;
END;
$$;

-- Otorgar permiso de ejecución para anon y authenticated
GRANT EXECUTE ON FUNCTION public.login_vendedor_pin(TEXT, VARCHAR(4)) TO anon, authenticated;

-- =============================================================================
-- 8. DATOS DE SEMILLA (SEED DATA) PARA PRUEBAS INMEDIATAS
-- =============================================================================
DO $$
DECLARE
    v_tenant_a UUID := '11111111-1111-4111-8111-111111111111';
    v_tenant_b UUID := '22222222-2222-4222-8222-222222222222';
    v_superadmin UUID := '99999999-9999-4999-8999-999999999999';
    v_supervisor_a UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    v_vendedor_a UUID := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    v_comercio_1 UUID := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    v_zona_sur UUID := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
BEGIN
    -- Insertar Tenants de ejemplo
    INSERT INTO public.empresas (tenant_id, nombre_empresa, activa)
    VALUES 
        (v_tenant_a, 'Distribuidora Los Andes S.A.', true),
        (v_tenant_b, 'Bebidas del Valle Ltda.', true)
    ON CONFLICT (tenant_id) DO NOTHING;

    -- Insertar Usuarios de prueba
    INSERT INTO public.usuarios (id_usuario, tenant_id, email, pin, rol, nombre_completo)
    VALUES
        (v_superadmin, NULL, 'admin@saas.com', NULL, 'SuperAdmin', 'Administrador Global SaaS'),
        (v_supervisor_a, v_tenant_a, 'supervisor@losandes.com', NULL, 'Supervisor', 'Carlos Mendoza'),
        (v_vendedor_a, v_tenant_a, 'vendedor@losandes.com', '1234', 'Vendedor', 'Juan Pérez')
    ON CONFLICT (email) DO NOTHING;

    -- Insertar Comercios Globales
    INSERT INTO public.comercios_master (id_comercio, google_place_id, nombre, categoria, latitud, longitud)
    VALUES
        (v_comercio_1, 'ChIJN1t_tDeuEmsRUsoyG83frY4', 'Almacén El Centenario', 'Supermercado Minorista', -34.603722, -58.381592),
        (gen_random_uuid(), 'ChIJgTwRe9avEmsRMt6sZ0frZ99', 'Kiosco La Estación', 'Kiosco / Drugstore', -34.608123, -58.373120)
    ON CONFLICT (google_place_id) DO NOTHING;

    -- Insertar Zonas
    INSERT INTO public.zonas (id_zona, tenant_id, nombre_zona, activa)
    VALUES
        (v_zona_sur, v_tenant_a, 'SUR-01', true)
    ON CONFLICT (id_zona) DO NOTHING;

    -- Insertar Productos
    INSERT INTO public.productos (tenant_id, nombre, precio, activo)
    VALUES
        (v_tenant_a, 'Agua Mineral 500ml (Pack x12)', 4500.00, true),
        (v_tenant_a, 'Gaseosa Cola 2.25L', 1850.00, true)
    ON CONFLICT DO NOTHING;
END $$;
