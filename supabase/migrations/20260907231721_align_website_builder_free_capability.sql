UPDATE public.plan_capabilities
SET website_builder_access = false,
    website_site_limit = 1
WHERE plan = 'one_app_free';
