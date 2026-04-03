import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type {
  Retreat,
  RetreatMember,
  RetreatDay,
  Meal,
  MealAssignment,
  Attendance,
  ShoppingItem,
} from '../types'

// ── Query hooks ──────────────────────────────────────────────────────

export function useMyRetreats() {
  return useQuery<(Retreat & { role: string })[]>({
    queryKey: ['my-retreats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('retreat_members')
        .select('role, retreats:retreat_id(*)')
        .eq('user_id', user.id)
      if (error) throw error
      return (data ?? []).map((row: any) => ({ ...row.retreats, role: row.role }))
    },
  })
}

export function useRetreat(id: string) {
  return useQuery<Retreat>({
    queryKey: ['retreat', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retreats')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useRetreatMembers(retreatId: string) {
  return useQuery<RetreatMember[]>({
    queryKey: ['retreat-members', retreatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retreat_members')
        .select('*')
        .eq('retreat_id', retreatId)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useRetreatDays(retreatId: string) {
  return useQuery<RetreatDay[]>({
    queryKey: ['retreat-days', retreatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retreat_days')
        .select('*')
        .eq('retreat_id', retreatId)
        .order('date')
      if (error) throw error
      return data
    },
  })
}

export function useMeals(retreatId: string) {
  return useQuery<Meal[]>({
    queryKey: ['meals', retreatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*, retreat_day:retreat_days!inner(*)')
        .eq('retreat_day.retreat_id', retreatId)
        .order('time')
      if (error) throw error
      return data
    },
  })
}

export function useAttendance(retreatId: string) {
  return useQuery<Attendance[]>({
    queryKey: ['attendance', retreatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, meal:meals!inner(retreat_day:retreat_days!inner(retreat_id))')
        .eq('meal.retreat_day.retreat_id', retreatId)
      if (error) throw error
      // flatten — strip the join metadata
      return data.map((a: Record<string, unknown>) => ({
        id: a.id as string,
        meal_id: a.meal_id as string,
        member_id: a.member_id as string,
      }))
    },
  })
}

export function useMealAssignments(mealId: string) {
  return useQuery<MealAssignment[]>({
    queryKey: ['meal-assignments', mealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_assignments')
        .select('*')
        .eq('meal_id', mealId)
      if (error) throw error
      return data
    },
  })
}

export function useShoppingItems(retreatId: string) {
  return useQuery<ShoppingItem[]>({
    queryKey: ['shopping-items', retreatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('retreat_id', retreatId)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

// ── Mutation hooks ───────────────────────────────────────────────────

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  // Parse as plain date parts to avoid timezone shifts
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const current = new Date(sy, sm - 1, sd)
  const last = new Date(ey, em - 1, ed)
  while (current <= last) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

const DEFAULT_MEALS = [
  { label: 'Breakfast', time: '08:00', style: 'generic' as const },
  { label: 'Lunch', time: '12:30', style: 'generic' as const },
  { label: 'Dinner', time: '19:00', style: 'assigned_recipe' as const },
]

export function useCreateRetreat() {
  const qc = useQueryClient()
  return useMutation<Retreat, Error, { name: string; start_date: string; end_date: string }>({
    mutationFn: async (input) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create the retreat with a join code
      const join_code = generateJoinCode()
      const { data: retreat, error } = await supabase
        .from('retreats')
        .insert({ ...input, join_code, created_by: user.id })
        .select()
        .single()
      if (error) throw error

      // Add creator as organiser
      await supabase.from('retreat_members').insert({
        retreat_id: retreat.id,
        user_id: user.id,
        display_name: user.email?.split('@')[0] || 'Organiser',
        email: user.email || '',
        role: 'organiser',
        allergies: '',
      })

      // Create days
      const dates = dateRange(input.start_date, input.end_date)
      const dayRows = dates.map((date) => ({ retreat_id: retreat.id, date }))
      const { data: createdDays } = await supabase
        .from('retreat_days')
        .insert(dayRows)
        .select()

      // Create default meals per day
      if (createdDays) {
        const mealRows = createdDays.flatMap((day) =>
          DEFAULT_MEALS.map((m) => ({
            retreat_day_id: day.id,
            label: m.label,
            time: m.time,
            style: m.style,
          }))
        )
        await supabase.from('meals').insert(mealRows)
      }

      return retreat
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retreats'] })
      qc.invalidateQueries({ queryKey: ['my-retreats'] })
    },
  })
}

export function useJoinRetreat() {
  const qc = useQueryClient()
  return useMutation<{ retreat_id: string }, Error, { join_code: string }>({
    mutationFn: async ({ join_code }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Find retreat by join code
      const { data: retreat, error: findError } = await supabase
        .from('retreats')
        .select('id')
        .eq('join_code', join_code)
        .single()
      if (findError) throw new Error('Invalid join code')

      // Check if a member row already exists for this email (pre-added by organiser)
      const userEmail = user.email || ''
      const { data: existing } = userEmail
        ? await supabase
            .from('retreat_members')
            .select('id')
            .eq('retreat_id', retreat.id)
            .eq('email', userEmail)
            .maybeSingle()
        : { data: null }

      if (existing) {
        // Link the pre-added member to this user
        await supabase
          .from('retreat_members')
          .update({ user_id: user.id })
          .eq('id', existing.id)
      } else {
        // Create new member
        const { error: joinError } = await supabase
          .from('retreat_members')
          .insert({
            retreat_id: retreat.id,
            user_id: user.id,
            display_name: user.email?.split('@')[0] || 'Guest',
            email: user.email || '',
            role: 'participant',
            allergies: '',
          })
        if (joinError) throw joinError
      }

      return { retreat_id: retreat.id }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retreat-members'] })
      qc.invalidateQueries({ queryKey: ['my-retreats'] })
    },
  })
}

export function useToggleAttendance() {
  const qc = useQueryClient()
  return useMutation<
    void,
    Error,
    { mealId: string; memberId: string; attending: boolean; retreatId: string }
  >({
    mutationFn: async ({ mealId, memberId, attending }) => {
      if (attending) {
        const { error } = await supabase
          .from('attendance')
          .insert({ meal_id: mealId, member_id: memberId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('meal_id', mealId)
          .eq('member_id', memberId)
        if (error) throw error
      }
    },
    onSuccess: (_, { retreatId }) => {
      qc.invalidateQueries({ queryKey: ['attendance', retreatId] })
    },
  })
}

export function useAddMeal() {
  const qc = useQueryClient()
  return useMutation<
    Meal,
    Error,
    { retreat_day_id: string; label: string; time: string; style?: string; retreatId: string }
  >({
    mutationFn: async ({ retreat_day_id, label, time, style }) => {
      const { data, error } = await supabase
        .from('meals')
        .insert({ retreat_day_id, label, time, style: style || 'generic' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { retreatId }) => {
      qc.invalidateQueries({ queryKey: ['meals', retreatId] })
    },
  })
}

export function useDeleteMeal() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; retreatId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('meals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { retreatId }) => {
      qc.invalidateQueries({ queryKey: ['meals', retreatId] })
    },
  })
}

export function useUpdateMeal() {
  const qc = useQueryClient()
  return useMutation<
    Meal,
    Error,
    { id: string; retreatId: string; updates: Partial<Omit<Meal, 'id'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { retreatId }) => {
      qc.invalidateQueries({ queryKey: ['meals', retreatId] })
    },
  })
}

export function useAddMealAssignment() {
  const qc = useQueryClient()
  return useMutation<
    MealAssignment,
    Error,
    { meal_id: string; member_id: string; duty: 'lead' | 'helper' }
  >({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('meal_assignments')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { meal_id }) => {
      qc.invalidateQueries({ queryKey: ['meal-assignments', meal_id] })
    },
  })
}

export function useRemoveMealAssignment() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; meal_id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('meal_assignments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { meal_id }) => {
      qc.invalidateQueries({ queryKey: ['meal-assignments', meal_id] })
    },
  })
}

export function useAddShoppingItem() {
  const qc = useQueryClient()
  return useMutation<
    ShoppingItem,
    Error,
    { retreat_id: string; name: string; quantity?: string; category?: string; meal_id?: string | null; added_by_member_id?: string | null; is_prefill?: boolean }
  >({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          retreat_id: input.retreat_id,
          name: input.name,
          quantity: input.quantity || null,
          category: input.category || 'misc',
          meal_id: input.meal_id || null,
          is_prefill: input.is_prefill ?? false,
          added_by: input.added_by_member_id || null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { retreat_id }) => {
      qc.invalidateQueries({ queryKey: ['shopping-items', retreat_id] })
    },
  })
}

export function useRemoveShoppingItem() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; retreat_id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { retreat_id }) => {
      qc.invalidateQueries({ queryKey: ['shopping-items', retreat_id] })
    },
  })
}

export function useAddMember() {
  const qc = useQueryClient()
  return useMutation<
    RetreatMember,
    Error,
    { retreat_id: string; display_name: string; email?: string }
  >({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('retreat_members')
        .insert({
          retreat_id: input.retreat_id,
          display_name: input.display_name,
          email: input.email || null,
          user_id: null,
          role: 'participant',
          allergies: '',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { retreat_id }) => {
      qc.invalidateQueries({ queryKey: ['retreat-members', retreat_id] })
    },
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation<
    RetreatMember,
    Error,
    { id: string; retreat_id: string; updates: Partial<Omit<RetreatMember, 'id'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('retreat_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { retreat_id }) => {
      qc.invalidateQueries({ queryKey: ['retreat-members', retreat_id] })
    },
  })
}
