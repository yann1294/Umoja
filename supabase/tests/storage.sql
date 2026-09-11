begin;
select plan(8);
select ok((select not public from storage.buckets where id = 'cms-public'), 'published derivatives are served by policy, not a public bucket');
select ok((select file_size_limit = 10485760 from storage.buckets where id = 'cms-private'), 'private CMS bucket is limited to 10MB');
select ok((select file_size_limit = 10485760 from storage.buckets where id = 'applicant-private'), 'applicant bucket is limited to 10MB');
select ok(has_table_privilege('anon', 'storage.objects', 'insert') = false, 'anon cannot write storage objects');

set local role anon;
select is((select count(*) from storage.objects where bucket_id = 'cms-private'), 0::bigint, 'anon cannot list private CMS files');
select is((select count(*) from storage.objects where bucket_id = 'applicant-private'), 0::bigint, 'anon cannot list applicant files');
select is((select count(*) from storage.objects where bucket_id = 'cms-public'), 0::bigint, 'empty public derivative bucket is listable without exposing private buckets');
select is(private.has_any_role(array['admin']::public.umoja_role[]), false, 'anon cannot forge storage authority');
reset role;

select * from finish();
rollback;
