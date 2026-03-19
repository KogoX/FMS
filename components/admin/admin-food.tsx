"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  ImageIcon,
} from "lucide-react"
import {
  getAdminFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
} from "@/app/actions/admin"
import { LoadingSpinner } from "@/components/loading-spinner"

interface FoodItem {
  id: string
  name: string
  category: string
  price: number
  description: string
  image: string
  calories: number
  protein: string
  rating: number
  delivery_time: string
  bun_type?: string
  is_available?: boolean
}

const CATEGORIES = ["Burgers", "Pizza", "Chicken", "Drinks", "Sides", "Desserts"]

export function AdminFood() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: "",
    category: "Burgers",
    price: "",
    description: "",
    image: "",
    calories: "",
    protein: "",
    rating: "4.5",
    delivery_time: "15-20 min",
    bun_type: "",
    is_available: true,
  })

  const loadFoodItems = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    const result = await getAdminFoodItems()
    if (result.error) {
      setErrorMsg(result.error)
    }
    if (result.data) {
      setFoodItems(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadFoodItems()
  }, [loadFoodItems])

  const filteredItems = foodItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const resetForm = () => {
    setForm({
      name: "",
      category: "Burgers",
      price: "",
      description: "",
      image: "",
      calories: "",
      protein: "",
      rating: "4.5",
      delivery_time: "15-20 min",
      bun_type: "",
      is_available: true,
    })
    setEditingItem(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (item: FoodItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      description: item.description,
      image: item.image,
      calories: item.calories.toString(),
      protein: item.protein,
      rating: item.rating.toString(),
      delivery_time: item.delivery_time,
      bun_type: item.bun_type || "",
      is_available: item.is_available ?? true,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)
    setSaving(true)

    const data = {
      name: form.name,
      category: form.category,
      price: parseFloat(form.price),
      description: form.description,
      image: form.image || "/placeholder.svg",
      calories: parseInt(form.calories) || 0,
      protein: form.protein,
      rating: parseFloat(form.rating) || 4.5,
      delivery_time: form.delivery_time,
      bun_type: form.bun_type || undefined,
      is_available: form.is_available,
    }

    if (editingItem) {
      const result = await updateFoodItem(editingItem.id, data)
      if (!result.error) {
        await loadFoodItems()
        setShowModal(false)
        resetForm()
      } else {
        setErrorMsg(result.error)
      }
    } else {
      const result = await createFoodItem(data)
      if (!result.error) {
        await loadFoodItems()
        setShowModal(false)
        resetForm()
      } else {
        setErrorMsg(result.error)
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    setErrorMsg(null)
    setInfoMsg(null)
    setDeleting(id)
    const previousItems = foodItems
    setFoodItems((current) => current.filter((item) => item.id !== id))
    const result = await deleteFoodItem(id)
    if (result.error) {
      setFoodItems(previousItems)
      setErrorMsg(result.error)
    }
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading menu" variant="inline" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Food Menu</h3>
          <p className="text-sm text-muted-foreground">
            {foodItems.length} items in menu
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>
      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
          {infoMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Food Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-card rounded-xl border border-border overflow-hidden group"
          >
            <div className="relative aspect-video bg-secondary">
              <Image
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-2 bg-card rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="p-2 bg-card rounded-lg text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                >
                  {deleting === item.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {item.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <span className="text-sm font-bold text-primary whitespace-nowrap">
                  KSh {item.price.toFixed(2)}
                </span>
              </div>
              {item.is_available === false && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded-sm uppercase tracking-wider">
                  Unavailable
                </span>
              )}
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span>{item.calories} cal</span>
                <span>{item.protein} protein</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No menu items found</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {editingItem ? "Edit Item" : "Add New Item"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Price (KSh) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="url"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      placeholder="https://..."
                      className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={form.calories}
                    onChange={(e) => setForm({ ...form, calories: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Protein
                  </label>
                  <input
                    type="text"
                    value={form.protein}
                    onChange={(e) => setForm({ ...form, protein: e.target.value })}
                    placeholder="e.g. 25g"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Delivery Time
                  </label>
                  <input
                    type="text"
                    value={form.delivery_time}
                    onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
                    placeholder="e.g. 15-20 min"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {form.category === "Burgers" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bun Type
                  </label>
                  <input
                    type="text"
                    value={form.bun_type}
                    onChange={(e) => setForm({ ...form, bun_type: e.target.value })}
                    placeholder="e.g. Brioche Bun"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={form.is_available}
                  onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                  className="w-4 h-4 text-primary bg-secondary border-border rounded focus:ring-primary/50"
                />
                <label htmlFor="is_available" className="text-sm font-medium text-foreground">
                  Available for ordering
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingItem ? "Update" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
