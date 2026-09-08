CREATE TABLE public.website_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE, public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120), form_type text NOT NULL CHECK (form_type IN ('contact','lead','custom')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','archived')), schema jsonb NOT NULL, settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_message text NOT NULL DEFAULT 'Thanks — we have received your message.' CHECK (char_length(success_message) <= 500), created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz,
  CHECK (jsonb_typeof(schema) = 'object' AND jsonb_typeof(settings) = 'object')
);
CREATE TABLE public.website_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE, form_id uuid NOT NULL REFERENCES public.website_forms(id) ON DELETE RESTRICT,
  submitted_values jsonb NOT NULL, normalized_email text, normalized_phone text, source_page_id uuid REFERENCES public.website_pages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','spam','failed','test')), spam_reason text, crm_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  automation_event_id uuid, request_key text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), CHECK (jsonb_typeof(submitted_values) = 'object')
);
CREATE INDEX website_forms_org_site ON public.website_forms(organization_id, site_id) WHERE archived_at IS NULL;
CREATE INDEX website_submissions_org_created ON public.website_form_submissions(organization_id, created_at DESC);
ALTER TABLE public.website_forms ENABLE ROW LEVEL SECURITY; ALTER TABLE public.website_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY website_forms_read ON public.website_forms FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY website_submissions_read ON public.website_form_submissions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
REVOKE ALL ON public.website_forms, public.website_form_submissions FROM anon, authenticated;
GRANT SELECT ON public.website_forms, public.website_form_submissions TO authenticated;
