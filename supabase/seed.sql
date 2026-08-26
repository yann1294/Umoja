-- Synthetic development data only. These ids, names and content do not represent people or clients.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoO6h6H6d5fWg4VITNRQNGjKn0pZ8d0Q8m', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@example.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoO6h6H6d5fWg4VITNRQNGjKn0pZ8d0Q8m', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reviewer@example.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoO6h6H6d5fWg4VITNRQNGjKn0pZ8d0Q8m', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'applicant@example.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoO6h6H6d5fWg4VITNRQNGjKn0pZ8d0Q8m', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"sub":"10000000-0000-0000-0000-000000000001","email":"admin@example.test"}', 'email', '10000000-0000-0000-0000-000000000001', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '{"sub":"10000000-0000-0000-0000-000000000002","email":"editor@example.test"}', 'email', '10000000-0000-0000-0000-000000000002', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '{"sub":"10000000-0000-0000-0000-000000000003","email":"reviewer@example.test"}', 'email', '10000000-0000-0000-0000-000000000003', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '{"sub":"10000000-0000-0000-0000-000000000004","email":"applicant@example.test"}', 'email', '10000000-0000-0000-0000-000000000004', now(), now(), now())
on conflict (id) do nothing;

insert into public.user_roles(user_id, role, granted_by) values
  ('10000000-0000-0000-0000-000000000001', 'admin', '10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'cms-editor', '10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'reviewer', '10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', 'extended', '10000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.profiles(user_id, public_slug, professional_name, locale, country_code, timezone, public_bio, visibility, public_consent_at, consent_version) values
  ('10000000-0000-0000-0000-000000000004', 'synthetic-contributor', 'Synthetic Contributor', 'en', 'KE', 'Africa/Nairobi', 'Synthetic profile for local policy tests.', 'public', now(), 'test-v1')
on conflict (user_id) do nothing;
insert into public.private_profile_details(user_id, encryption_key_version, encrypted_payload, consent_at) values
  ('10000000-0000-0000-0000-000000000004', 'v1', 'v1.synthetic-private-payload', now())
on conflict (user_id) do nothing;
insert into public.skills(id, canonical_name, category) values ('20000000-0000-0000-0000-000000000001', 'TypeScript', 'engineering') on conflict do nothing;
insert into public.profile_skills(profile_id, skill_id, level, years_experience, verification) values ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 3, 2, 'self_reported') on conflict do nothing;
insert into public.membership_history(user_id, tier, effective_from, approved_by, evidence_digest) values ('10000000-0000-0000-0000-000000000004', 'extended', now(), '10000000-0000-0000-0000-000000000001', 'synthetic-digest') on conflict do nothing;
