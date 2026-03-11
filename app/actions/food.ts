"use server"

import { createClient } from "@/lib/supabase/server"

export async function getFoodItems() {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from("food_items")
    .select("*")
    .eq("is_available", true)
    .order("created_at", { ascending: true })

  if (error) return { error: error.message, data: [] }

  const { data: toppings } = await supabase
    .from("toppings")
    .select("*")

  const { data: sides } = await supabase
    .from("side_options")
    .select("*")

  const enrichedItems = (items || []).map((item) => {
    const itemToppings = (toppings || []).filter(
      (t) => t.food_item_id === item.id || t.is_global
    )
    const itemSides = (sides || []).filter(
      (s) => s.food_item_id === item.id || s.is_global
    )

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      price: Number(item.price),
      image: item.image_url,
      description: item.description,
      calories: item.calories,
      protein: item.protein,
      bunType: item.bun_type,
      rating: Number(item.rating),
      ratingCount: item.rating_count,
      deliveryTime: item.delivery_time,
      toppings: itemToppings.map((t) => ({ name: t.name, image: t.image_url })),
      sides: itemSides.map((s) => ({ name: s.name, image: s.image_url })),
    }
  })

  return { data: enrichedItems }
}
