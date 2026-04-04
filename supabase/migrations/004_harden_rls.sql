-- ============================================================
-- Migration 004: Harden RLS policies
--
-- Fixes:
--   1. retreats_select: restrict to members only (was open to all)
--   2. retreat_members_insert: only self-join as participant, or organiser adds
--   3. retreat_members_update: prevent role escalation by non-organisers
--   4. retreat_members_delete: organisers can remove members, users can leave
--   5. attendance/meal_assignments: validate meal is in same retreat as member
--   6. shopping_items_insert: validate added_by belongs to current user
--   7. Add security-definer function for join-code lookup (bypasses RLS)
-- ============================================================

-- --------------------------------------------------------
-- 1. Lock down retreats_select to members + creator only
-- --------------------------------------------------------
drop policy if exists "retreats_select" on retreats;
create policy "retreats_select" on retreats
  for select to authenticated
  using (
    is_retreat_member(id)
    or created_by = auth.uid()
  );

-- Security-definer function for join-code lookup (user isn't a member yet)
create or replace function lookup_retreat_by_join_code(p_join_code text)
returns uuid
language sql
security definer
stable
as $$
  select id from retreats where join_code = p_join_code limit 1;
$$;

-- --------------------------------------------------------
-- 2. Lock down retreat_members_insert
--    - Users can only insert themselves as 'participant'
--    - Organisers can add anyone to their retreat
-- --------------------------------------------------------
drop policy if exists "retreat_members_insert" on retreat_members;
create policy "retreat_members_insert" on retreat_members
  for insert to authenticated
  with check (
    -- Self-join: must set own user_id and role = participant
    (
      user_id = auth.uid()
      and role = 'participant'
    )
    -- Or organiser adding a member (including pre-added with null user_id)
    or is_retreat_organiser(retreat_id)
  );

-- --------------------------------------------------------
-- 3. Prevent role escalation via update
--    Split into two policies for clarity
-- --------------------------------------------------------
drop policy if exists "retreat_members_update" on retreat_members;

-- Self-update: can change display_name, allergies, email — NOT role
create policy "retreat_members_update_self" on retreat_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and role = (select rm.role from retreat_members rm where rm.id = retreat_members.id)
  );

-- Organiser update: can change anything for members in their retreat
create policy "retreat_members_update_organiser" on retreat_members
  for update to authenticated
  using (is_retreat_organiser(retreat_id))
  with check (is_retreat_organiser(retreat_id));

-- --------------------------------------------------------
-- 4. Allow organisers to remove members, users to leave
-- --------------------------------------------------------
create policy "retreat_members_delete" on retreat_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or is_retreat_organiser(retreat_id)
  );

-- --------------------------------------------------------
-- 5. Cross-retreat validation on attendance
--    Ensure the meal belongs to the same retreat as the member
-- --------------------------------------------------------
drop policy if exists "attendance_insert" on attendance;
create policy "attendance_insert" on attendance
  for insert to authenticated
  with check (
    exists (
      select 1 from retreat_members rm
      join retreat_days rd on rd.retreat_id = rm.retreat_id
      join meals m on m.retreat_day_id = rd.id
      where rm.id = attendance.member_id
        and m.id = attendance.meal_id
        and (
          rm.user_id = auth.uid()
          or exists (
            select 1 from retreat_members org
            where org.retreat_id = rm.retreat_id
              and org.user_id = auth.uid()
              and org.role = 'organiser'
          )
        )
    )
  );

drop policy if exists "attendance_delete" on attendance;
create policy "attendance_delete" on attendance
  for delete to authenticated
  using (
    exists (
      select 1 from retreat_members rm
      join retreat_days rd on rd.retreat_id = rm.retreat_id
      join meals m on m.retreat_day_id = rd.id
      where rm.id = attendance.member_id
        and m.id = attendance.meal_id
        and (
          rm.user_id = auth.uid()
          or exists (
            select 1 from retreat_members org
            where org.retreat_id = rm.retreat_id
              and org.user_id = auth.uid()
              and org.role = 'organiser'
          )
        )
    )
  );

-- --------------------------------------------------------
-- 5b. Cross-retreat validation on meal_assignments
-- --------------------------------------------------------
drop policy if exists "meal_assignments_insert" on meal_assignments;
create policy "meal_assignments_insert" on meal_assignments
  for insert to authenticated
  with check (
    exists (
      select 1 from retreat_members rm
      join retreat_days rd on rd.retreat_id = rm.retreat_id
      join meals m on m.retreat_day_id = rd.id
      where rm.id = meal_assignments.member_id
        and m.id = meal_assignments.meal_id
        and (
          rm.user_id = auth.uid()
          or exists (
            select 1 from retreat_members org
            where org.retreat_id = rm.retreat_id
              and org.user_id = auth.uid()
              and org.role = 'organiser'
          )
        )
    )
  );

drop policy if exists "meal_assignments_delete" on meal_assignments;
create policy "meal_assignments_delete" on meal_assignments
  for delete to authenticated
  using (
    exists (
      select 1 from retreat_members rm
      join retreat_days rd on rd.retreat_id = rm.retreat_id
      join meals m on m.retreat_day_id = rd.id
      where rm.id = meal_assignments.member_id
        and m.id = meal_assignments.meal_id
        and (
          rm.user_id = auth.uid()
          or exists (
            select 1 from retreat_members org
            where org.retreat_id = rm.retreat_id
              and org.user_id = auth.uid()
              and org.role = 'organiser'
          )
        )
    )
  );

-- --------------------------------------------------------
-- 6. Validate added_by on shopping_items insert
-- --------------------------------------------------------
drop policy if exists "shopping_items_insert" on shopping_items;
create policy "shopping_items_insert" on shopping_items
  for insert to authenticated
  with check (
    is_retreat_member(retreat_id)
    and (
      added_by is null
      or exists (
        select 1 from retreat_members rm
        where rm.id = shopping_items.added_by
          and rm.retreat_id = shopping_items.retreat_id
          and rm.user_id = auth.uid()
      )
    )
  );
