-- Allow the retreat creator to delete the retreat (cascades to all related data)
create policy "retreats_delete" on retreats
  for delete using (auth.uid() = created_by);
