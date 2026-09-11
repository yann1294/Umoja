begin;
select plan(18);

select ok(has_table_privilege('anon', 'public.project_intakes', 'select') = false, 'anon has no intake table grant');
select ok(has_table_privilege('anon', 'public.project_intakes', 'insert') = false, 'anon cannot insert intake rows');
select ok(has_table_privilege('authenticated', 'public.project_intakes', 'insert') = false, 'authenticated users cannot insert intake rows');
select ok(has_table_privilege('anon', 'public.user_roles', 'select') = false, 'anon cannot enumerate role assignments');
select ok(has_function_privilege('public', 'private.has_role(public.umoja_role)', 'execute') = false, 'private role helper is not public');
select ok(has_function_privilege('authenticated', 'private.has_role(public.umoja_role)', 'execute'), 'authenticated RLS caller can execute scoped helper');
select ok(has_table_privilege('anon', 'public.account_invitations', 'select') = false, 'anon cannot enumerate invitations');
select ok(has_table_privilege('authenticated', 'public.account_invitations', 'insert') = false, 'authenticated users cannot insert invitation rows directly');
select ok(has_function_privilege('authenticated', 'public.create_account_invitation(text,text,text,text,public.umoja_role,public.membership_tier,public.invitation_membership_status,text,timestamptz,text)', 'execute'), 'authenticated callers reach the authorization-enforcing issue RPC');
select ok(has_function_privilege('authenticated', 'public.record_account_invitation_delivery(uuid,public.invitation_delivery_state,text,text)', 'execute') = false, 'authenticated callers cannot forge delivery results');
select ok(has_function_privilege('service_role', 'public.record_account_invitation_delivery(uuid,public.invitation_delivery_state,text,text)', 'execute'), 'service role can record server delivery results');
select ok(has_function_privilege('service_role', 'public.accept_account_invitation(uuid,text,uuid,text)', 'execute'), 'service role can run the validated acceptance transaction');

set local role anon;
select is((select count(*) from public.profiles), 1::bigint, 'anon sees only consented public profile');
select is((select count(*) from public.private_profile_details), 0::bigint, 'anon cannot see private profile details');
select is(private.has_role('admin'::public.umoja_role), false, 'anonymous helper abuse fails closed');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.private_profile_details), 1::bigint, 'owner can read their private details');
select is((select count(*) from public.project_intakes), 0::bigint, 'unrelated applicant sees no project intake');
reset role;

select * from finish();
rollback;
