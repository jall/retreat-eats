export type Role = 'organiser' | 'participant'
export type MealStyle = 'generic' | 'assigned_recipe'
export type Duty = 'lead' | 'helper'

export type Retreat = {
  id: string
  name: string
  start_date: string
  end_date: string
  join_code: string
  created_by: string
  created_at: string
}

export type RetreatMember = {
  id: string
  retreat_id: string
  user_id: string | null
  display_name: string
  email: string
  role: Role
  allergies: string
  created_at: string
}

export type RetreatDay = {
  id: string
  retreat_id: string
  date: string
}

export type Meal = {
  id: string
  retreat_day_id: string
  label: string
  time: string
  style: MealStyle
  recipe_title: string | null
  recipe_notes: string | null
}

export type MealAssignment = {
  id: string
  meal_id: string
  member_id: string
  duty: Duty
}

export type Attendance = {
  id: string
  meal_id: string
  member_id: string
}

export type ShoppingItem = {
  id: string
  retreat_id: string
  meal_id: string | null
  name: string
  quantity: string | null
  category: string
  is_prefill: boolean
  added_by: string | null
  created_at: string
}

// Joined types for queries
export type MealWithDay = Meal & { retreat_day: RetreatDay }
export type MealWithAssignments = Meal & {
  meal_assignments: (MealAssignment & { member: RetreatMember })[]
  attendance: (Attendance & { member: RetreatMember })[]
}
