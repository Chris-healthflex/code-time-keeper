CREATE OR REPLACE FUNCTION public.claim_admin_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.admin_invites; admin_count integer;
BEGIN
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;
  SELECT * INTO inv FROM public.admin_invites WHERE lower(email) = lower(NEW.email) AND claimed_at IS NULL;
  IF inv.id IS NOT NULL THEN
    UPDATE public.admin_invites SET claimed_at = now() WHERE id = inv.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_admin_invite() FROM PUBLIC, anon, authenticated;