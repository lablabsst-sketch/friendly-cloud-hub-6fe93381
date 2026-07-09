# Lecciones de seguridad — SSTLink

Errores encontrados y resueltos durante el desarrollo. Aplicar desde el inicio en proyectos futuros.

---

## 1. Buckets de Storage — nunca públicos por defecto

**Error:** Bucket `firmas` tenía políticas anon insert/read abiertas. Bucket `inspecciones` era público.

**Fix aplicado:**
- `firmas`: solo authenticated + empresa propia. Firma pública se hace vía Edge Function `submit-firma` con service role + validación de token.
- `inspecciones`: flipado a privado, URLs firmadas (signed URLs) para acceso temporal.

**Regla futura:** Todo bucket empieza privado. Si necesita acceso público/anon, usar una Edge Function con validación de token — nunca política USING(true).

---

## 2. Edge Functions con secreto compartido para bots externos

**Error:** Edge Function `consulta-trabajador` no requería autenticación — cualquiera podía consultarla.

**Fix aplicado:** Header `X-Bot-Secret: <BOT_SHARED_SECRET>` requerido. Sin él, la función retorna 401.

**Acción manual pendiente:** Configurar el bot de WhatsApp para enviar `X-Bot-Secret: <valor>` en cada llamada a `consulta-trabajador`.

**Regla futura:** Toda Edge Function expuesta a servicios externos (bots, webhooks, integraciones) debe requerir un secreto compartido en header. Nunca exponer sin auth.

---

## 3. Políticas RLS de empresas — siempre scoped a la empresa propia

**Error:** Política admin de `empresas` permitía acceso más amplio de lo necesario.

**Fix aplicado:** Política re-scoped a `empresa_id = get_user_empresa_id(auth.uid())`.

**Regla futura:** Toda política RLS de admin debe filtrar por `empresa_id` explícitamente. Nunca asumir que "ser admin" es suficiente sin scope de empresa.

---

## 4. Columnas sensibles — column-level security + RPCs

**Error:** Columnas de tokens (invite_token, firma_token, etc.) eran legibles directamente vía SELECT.

**Fix aplicado:** Column-level security revocado para anon/authenticated. Acceso solo vía RPCs admin con SECURITY DEFINER.

**Regla futura:** Columnas que contengan tokens, secretos o datos sensibles deben tener column-level grants restrictivos desde el inicio. Exponerlos solo vía RPC con validación.

---

## 5. EXECUTE en SECURITY DEFINER — nunca a PUBLIC

**Error:** Varias funciones SECURITY DEFINER tenían EXECUTE grant a PUBLIC o a `anon`.

**Fix aplicado:** `REVOKE ALL ON FUNCTION ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` (o al rol mínimo necesario).

**Regla futura:** Al crear cualquier función SECURITY DEFINER:
```sql
REVOKE ALL ON FUNCTION nombre_funcion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nombre_funcion() TO authenticated; -- o el rol mínimo
```

---

## 6. Políticas anon del portal — eliminar cuando no se usan

**Error:** Quedaron políticas anon stale del portal que ya no correspondían al flujo actual.

**Fix aplicado:** Políticas eliminadas. Portal funciona vía RPC `get_portal_cliente` con validación de token.

**Regla futura:** Al cambiar un flujo (ej: de política RLS directa a RPC), eliminar inmediatamente las políticas viejas. Las políticas stale son superficie de ataque invisible.

---

## 7. search_path en funciones SECURITY DEFINER

**Error:** Funciones sin `SET search_path = public` son vulnerables a ataques de schema poisoning.

**Fix aplicado:** `SET search_path = public` agregado a todas las funciones SECURITY DEFINER.

**Regla futura:** Template mínimo para toda función SECURITY DEFINER:
```sql
CREATE OR REPLACE FUNCTION nombre()
RETURNS tipo LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- lógica
END;
$$;
REVOKE ALL ON FUNCTION nombre() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nombre() TO authenticated;
```

---

## 8. Invitaciones y tokens — nunca por política RLS directa

**Error:** `invitaciones` tenía política `USING(true)` que exponía todos los registros a anon.

**Fix aplicado:** Política eliminada. Lookup de invitación vía RPC `get_invitation_by_token(token)` que valida estado y expiry server-side.

**Regla futura:** Cualquier flujo basado en tokens (invitaciones, links de firma, portal de proveedor) debe ir por RPC — nunca exponer la tabla directamente a anon.

---

## 9. Column-level security en tokens de portal e invitaciones

**Error:** Las columnas `token` en `clientes_portal` e `invitaciones` eran visibles a todos los usuarios de la misma empresa vía SELECT, permitiendo account takeover.

**Fix aplicado:**
```sql
REVOKE SELECT (token) ON public.clientes_portal FROM authenticated;
REVOKE SELECT (token) ON public.invitaciones FROM authenticated;
-- Acceso solo vía RPC con SECURITY DEFINER
```

**Regla futura:** Toda columna llamada `token`, `secret`, `invite_token`, `firma_token`, `access_token` debe tener `REVOKE SELECT` para `authenticated` desde el momento de creación.

---

## 10. user_roles INSERT/UPDATE sin scope de empresa — escalada de privilegios

**Error:** La política INSERT de `user_roles` no validaba que el usuario destino perteneciera a la misma empresa del caller, permitiendo que cualquier admin se otorgara rol en otra empresa.

**Fix aplicado:** Política reescrita con doble validación: caller es admin + empresa del target == empresa del caller.

**Regla futura:** Toda política sobre tablas de roles/permisos debe tener:
1. `has_role(auth.uid(), 'administrador')` — solo admins pueden modificar
2. Scope explícito de empresa en el WITH CHECK — nunca asumir que ser admin es suficiente

---

## 11. Bucket sin política UPDATE

**Error:** Bucket `inspecciones` tenía INSERT y SELECT pero no UPDATE, impidiendo a los owners actualizar sus archivos.

**Regla futura:** Al crear políticas de storage, verificar las 4 operaciones: SELECT, INSERT, UPDATE, DELETE. No omitir UPDATE por olvido.

---

## Checklist de seguridad para nuevos proyectos Supabase

- [ ] Todos los buckets creados como **privados**
- [ ] Buckets con las 4 políticas: SELECT, INSERT, UPDATE, DELETE
- [ ] Edge Functions externas con `X-Bot-Secret` o JWT
- [ ] Políticas RLS siempre filtran por `empresa_id` o equivalente
- [ ] Columnas `token`/`secret`: `REVOKE SELECT FROM authenticated` desde el inicio
- [ ] Políticas de roles: doble validación (es admin + misma empresa)
- [ ] Funciones SECURITY DEFINER: REVOKE PUBLIC + SET search_path
- [ ] Políticas de invitaciones/tokens: vía RPC, no USING(true)
- [ ] Revisar políticas stale al cambiar flujos
- [ ] Audit con Supabase Advisor antes de ir a producción
