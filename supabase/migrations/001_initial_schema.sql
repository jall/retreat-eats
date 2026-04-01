-- ============================================================
-- Retreat Eats – initial schema
-- ============================================================

-- 1. Retreats
create table retreats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  join_code text unique not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

-- 2. Retreat members
create table retreat_members (
  id uuid primary key default gen_random_uuid(),
  retreat_id uuid references retreats(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  email text not null,
  role text not null check (role in ('organiser', 'participant')),
  allergies text default '',
  created_at timestamptz default now(),
  unique(retreat_id, email)
);

-- 3. Retreat days
create table retreat_days (
  id uuid primary key default gen_random_uuid(),
  retreat_id uuid references retreats(id) on delete cascade not null,
  date date not null,
  unique(retreat_id, date)
);

-- 4. Meals
create table meals (
  id uuid primary key default gen_random_uuid(),
  retreat_day_id uuid references retreat_days(id) on delete cascade not null,
  label text not null,
  time time not null,
  style text not null default 'generic' check (style in ('generic', 'assigned_recipe')),
  recipe_title text,
  recipe_notes text,
  unique(retreat_day_id, label)
);

-- 5. Meal assignments
create table meal_assignments (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references meals(id) on delete cascade not null,
  member_id uuid references retreat_members(id) on delete cascade not null,
  duty text not null check (duty in ('lead', 'helper')),
  unique(meal_id, member_id, duty)
);

-- 6. Attendance
create table attendance (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references meals(id) on delete cascade not null,
  member_id uuid references retreat_members(id) on delete cascade not null,
  unique(meal_id, member_id)
);

-- 7. Shopping items
create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  retreat_id uuid references retreats(id) on delete cascade not null,
  meal_id uuid references meals(id) on delete set null,
  name text not null,
  quantity text,
  category text not null default 'misc',
  is_prefill boolean default false,
  added_by uuid references retreat_members(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================
-- Indexes on foreign keys
-- ============================================================
create index idx_retreat_members_retreat on retreat_members(retreat_id);
create index idx_retreat_members_user on retreat_members(user_id);
create index idx_retreat_days_retreat on retreat_days(retreat_id);
create index idx_meals_retreat_day on meals(retreat_day_id);
create index idx_meal_assignments_meal on meal_assignments(meal_id);
create index idx_meal_assignments_member on meal_assignments(member_id);
create index idx_attendance_meal on attendance(meal_id);
create index idx_attendance_member on attendance(member_id);
create index idx_shopping_items_retreat on shopping_items(retreat_id);
create index idx_shopping_items_meal on shopping_items(meal_id);
create index idx_shopping_items_added_by on shopping_items(added_by);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Helper: is the current user a member of the given retreat?
create or replace function is_retreat_member(p_retreat_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from retreat_members
    where retreat_id = p_retreat_id
      and user_id = auth.uid()
  );
$$;

-- Helper: is the current user an organiser of the given retreat?
create or replace function is_retreat_organiser(p_retreat_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from retreat_members
    where retreat_id = p_retreat_id
      and user_id = auth.uid()
      and role = 'organiser'
  );
$$;

-- --------------------------------------------------------
-- retreats
-- --------------------------------------------------------
alter table retreats enable row level security;

create policy "retreats_select" on retreats
  for select to authenticated
  using (true);

create policy "retreats_insert" on retreats
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "retreats_update" on retreats
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- --------------------------------------------------------
-- retreat_members
-- --------------------------------------------------------
alter table retreat_members enable row level security;

create policy "retreat_members_select" on retreat_members
  for select to authenticated
  using (is_retreat_member(retreat_id));

create policy "retreat_members_insert" on retreat_members
  for insert to authenticated
  with check (true);

create policy "retreat_members_update" on retreat_members
  for update to authenticated
  using (user_id = auth.uid());

-- --------------------------------------------------------
-- retreat_days
-- --------------------------------------------------------
alter table retreat_days enable row level security;

create policy "retreat_days_select" on retreat_days
  for select to authenticated
  using (is_retreat_member(retreat_id));

create policy "retreat_days_insert" on retreat_days
  for insert to authenticated
  with check (is_retreat_member(retreat_id));

create policy "retreat_days_update" on retreat_days
  for update to authenticated
  using (is_retreat_member(retreat_id));

create policy "retreat_days_delete" on retreat_days
  for delete to authenticated
  using (is_retreat_organiser(retreat_id));

-- --------------------------------------------------------
-- meals
-- --------------------------------------------------------
alter table meals enable row level security;

-- Select: any member of the retreat
create policy "meals_select" on meals
  for select to authenticated
  using (
    exists (
      select 1 from retreat_days rd
      where rd.id = meals.retreat_day_id
        and is_retreat_member(rd.retreat_id)
    )
  );

-- Insert/update/delete: organisers only
create policy "meals_insert" on meals
  for insert to authenticated
  with check (
    exists (
      select 1 from retreat_days rd
      where rd.id = meals.retreat_day_id
        and is_retreat_organiser(rd.retreat_id)
    )
  );

create policy "meals_update" on meals
  for update to authenticated
  using (
    exists (
      select 1 from retreat_days rd
      where rd.id = meals.retreat_day_id
        and is_retreat_organiser(rd.retreat_id)
    )
  );

create policy "meals_delete" on meals
  for delete to authenticated
  using (
    exists (
      select 1 from retreat_days rd
      where rd.id = meals.retreat_day_id
        and is_retreat_organiser(rd.retreat_id)
    )
  );

-- --------------------------------------------------------
-- meal_assignments
-- --------------------------------------------------------
alter table meal_assignments enable row level security;

create policy "meal_assignments_select" on meal_assignments
  for select to authenticated
  using (
    exists (
      select 1 from meals m
      join retreat_days rd on rd.id = m.retreat_day_id
      where m.id = meal_assignments.meal_id
        and is_retreat_member(rd.retreat_id)
    )
  );

create policy "meal_assignments_insert" on meal_assignments
  for insert to authenticated
  with check (
    exists (
      select 1 from retreat_members rm
      where rm.id = meal_assignments.member_id
        and rm.user_id = auth.uid()
    )
  );

create policy "meal_assignments_delete" on meal_assignments
  for delete to authenticated
  using (
    exists (
      select 1 from retreat_members rm
      where rm.id = meal_assignments.member_id
        and rm.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------
-- attendance
-- --------------------------------------------------------
alter table attendance enable row level security;

create policy "attendance_select" on attendance
  for select to authenticated
  using (
    exists (
      select 1 from meals m
      join retreat_days rd on rd.id = m.retreat_day_id
      where m.id = attendance.meal_id
        and is_retreat_member(rd.retreat_id)
    )
  );

create policy "attendance_insert" on attendance
  for insert to authenticated
  with check (
    exists (
      select 1 from retreat_members rm
      where rm.id = attendance.member_id
        and rm.user_id = auth.uid()
    )
  );

create policy "attendance_delete" on attendance
  for delete to authenticated
  using (
    exists (
      select 1 from retreat_members rm
      where rm.id = attendance.member_id
        and rm.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------
-- shopping_items
-- --------------------------------------------------------
alter table shopping_items enable row level security;

create policy "shopping_items_select" on shopping_items
  for select to authenticated
  using (is_retreat_member(retreat_id));

create policy "shopping_items_insert" on shopping_items
  for insert to authenticated
  with check (is_retreat_member(retreat_id));

-- Update: added_by can update their own, organisers can update any
create policy "shopping_items_update" on shopping_items
  for update to authenticated
  using (
    exists (
      select 1 from retreat_members rm
      where rm.retreat_id = shopping_items.retreat_id
        and rm.user_id = auth.uid()
        and (
          shopping_items.added_by = rm.id
          or rm.role = 'organiser'
        )
    )
  );

-- Delete: added_by can delete their own, organisers can delete any
create policy "shopping_items_delete" on shopping_items
  for delete to authenticated
  using (
    exists (
      select 1 from retreat_members rm
      where rm.retreat_id = shopping_items.retreat_id
        and rm.user_id = auth.uid()
        and (
          shopping_items.added_by = rm.id
          or rm.role = 'organiser'
        )
    )
  );
