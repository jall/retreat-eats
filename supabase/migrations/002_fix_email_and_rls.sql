-- Allow multiple members without email by making email nullable
-- PostgreSQL unique constraints ignore NULLs, so (retreat_id, NULL) won't collide
alter table retreat_members alter column email drop not null;
alter table retreat_members alter column email set default null;

-- Update existing empty-string emails to NULL
update retreat_members set email = null where email = '';

-- Drop and recreate the unique constraint to work with nullable email
alter table retreat_members drop constraint retreat_members_retreat_id_email_key;
create unique index retreat_members_retreat_email_uniq
  on retreat_members (retreat_id, email) where email is not null;

-- Allow organisers to manage attendance for any member in their retreat
drop policy if exists "attendance_insert" on attendance;
create policy "attendance_insert" on attendance
  for insert to authenticated
  with check (
    exists (
      select 1 from retreat_members rm
      where rm.id = attendance.member_id
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
      where rm.id = attendance.member_id
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

-- Also allow organisers to manage meal assignments for any member
drop policy if exists "meal_assignments_insert" on meal_assignments;
create policy "meal_assignments_insert" on meal_assignments
  for insert to authenticated
  with check (
    exists (
      select 1 from retreat_members rm
      where rm.id = meal_assignments.member_id
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
      where rm.id = meal_assignments.member_id
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

-- Allow organisers to update any member (not just own row)
drop policy if exists "retreat_members_update" on retreat_members;
create policy "retreat_members_update" on retreat_members
  for update to authenticated
  using (
    user_id = auth.uid()
    or is_retreat_organiser(retreat_id)
  );
