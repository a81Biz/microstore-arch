-- Micro-Store Arch: Triggers y Funciones de Autenticación
-- Versión: 1.0

BEGIN;

-- 1. Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'admin@tienda.com' THEN 'vendor'::user_role
      ELSE 'customer'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta después de crear un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Función para verificar si el vendedor debe cambiar contraseña
CREATE OR REPLACE FUNCTION public.check_password_change_required(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_changed_at TIMESTAMPTZ;
BEGIN
  SELECT password_changed_at INTO v_changed_at
  FROM public.profiles
  WHERE id = p_user_id;

  -- Si nunca ha cambiado la contraseña, requiere cambio
  RETURN v_changed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para marcar cambio de contraseña realizado
CREATE OR REPLACE FUNCTION public.mark_password_changed(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET password_changed_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para verificar si TOTP está habilitado
CREATE OR REPLACE FUNCTION public.is_totp_enabled(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT totp_enabled INTO v_enabled
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar políticas RLS para permitir admin sin MFA en setup inicial
-- (El admin necesita configurar MFA antes de que el claim amr exista)

-- Política temporal para admin durante setup de MFA
CREATE POLICY "Admin can read own profile during setup" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id AND
    role = 'vendor'::user_role AND
    totp_enabled = FALSE
  );

CREATE POLICY "Admin can update own profile during setup" ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id AND
    role = 'vendor'::user_role AND
    totp_enabled = FALSE
  )
  WITH CHECK (
    auth.uid() = id AND
    role = 'vendor'::user_role
  );

-- Política para admin con MFA verificado
CREATE POLICY "Admin with MFA can read all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'vendor'::user_role
        AND (auth.jwt()->>'amr')::jsonb ? 'mfa'
    )
  );

COMMIT;
