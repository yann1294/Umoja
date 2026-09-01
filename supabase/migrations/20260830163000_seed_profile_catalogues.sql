insert into public.languages(code, display_label_en, display_label_fr) values
  ('en', 'English', 'Anglais'), ('fr', 'French', 'Français'), ('sw', 'Swahili', 'Swahili'),
  ('ar', 'Arabic', 'Arabe'), ('pt', 'Portuguese', 'Portugais') on conflict (code) do nothing;
insert into public.skills(canonical_name, category) values
  ('TypeScript', 'Engineering'), ('React', 'Engineering'), ('Next.js', 'Engineering'),
  ('Product design', 'Design'), ('Data analysis', 'Data'), ('Project management', 'Delivery') on conflict do nothing;
