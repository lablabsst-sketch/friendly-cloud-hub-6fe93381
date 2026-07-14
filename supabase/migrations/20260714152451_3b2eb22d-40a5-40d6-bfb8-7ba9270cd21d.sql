-- Portal.tsx usa get_portal_cliente(p_nit_cedula text). Se elimina la versión de 2 args no utilizada.
DROP FUNCTION IF EXISTS public.get_portal_cliente(text, uuid);