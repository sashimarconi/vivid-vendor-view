DELETE FROM public.visitor_sessions WHERE page_url IN ('/test','/test2');
DELETE FROM public.page_events WHERE page_url IN ('/test','/test2');