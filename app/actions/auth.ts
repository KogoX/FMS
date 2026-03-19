"use server"

import { createClient } from "@/lib/supabase/server"

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = await createClient()

  const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/`
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/`
      : "http://localhost:3000/"

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Check if user already exists (Supabase returns user with identities: [] for existing unconfirmed users)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists. Please sign in or check your email for verification." }
  }

  return { data }
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signInWithProvider(provider: 'google' | 'facebook') {
  const supabase = await createClient()

  const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/auth/callback`
      : "http://localhost:3000/api/auth/callback"

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { data }
}
