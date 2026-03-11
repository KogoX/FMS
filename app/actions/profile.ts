"use server"

import { createClient } from "@/lib/supabase/server"

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateProfile(updates: {
  full_name?: string
  email?: string
  phone?: string
  mpesa_number?: string
  address?: string
  delivery_lat?: number
  delivery_lng?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}
