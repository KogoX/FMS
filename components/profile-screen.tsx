"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ArrowLeft,
  Search,
  Mail,
  Phone,
  MapPin,
  LogOut,
  Smartphone,
  Check,
  X,
  Edit3,
} from "lucide-react"
import type { UserProfile } from "@/lib/store"

interface ProfileScreenProps {
  profile: UserProfile
  onUpdateProfile: (profile: UserProfile) => void
  deliveryAddress: string
  onBack: () => void
  onLogout: () => void
  onSetManualLocation?: (city: string, address: string) => void
}

export function ProfileScreen({
  profile,
  onUpdateProfile,
  deliveryAddress,
  onBack,
  onLogout,
  onSetManualLocation,
}: ProfileScreenProps) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<UserProfile>(profile)
  const [showMpesaSetup, setShowMpesaSetup] = useState(false)
  const [mpesaInput, setMpesaInput] = useState(profile.mpesaNumber)
  const [showAddressEdit, setShowAddressEdit] = useState(false)
  const [addressInput, setAddressInput] = useState("")

  const handleSave = () => {
    onUpdateProfile(editData)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditData(profile)
    setEditing(false)
  }

  const handleSaveMpesa = () => {
    const updated = { ...profile, mpesaNumber: mpesaInput }
    onUpdateProfile(updated)
    setEditData(updated)
    setShowMpesaSetup(false)
  }

  return (
    <div className="flex flex-col pb-20 bg-card min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Profile</h1>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Search"
        >
          <Search size={20} className="text-foreground" />
        </button>
      </header>

      {/* Avatar */}
      <div className="flex flex-col items-center mt-4">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary relative">
          <Image
            src="/images/avatar.jpg"
            alt="Profile photo"
            fill
            className="object-cover"
          />
        </div>
        <h2 className="text-lg font-bold text-foreground mt-3">
          {profile.fullName}
        </h2>
      </div>

      {/* Info Section */}
      {!editing ? (
        <div className="flex flex-col gap-3 px-5 mt-6">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3.5">
            <Mail size={16} className="text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">Email</p>
              <p className="text-xs font-semibold text-foreground truncate">
                {profile.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3.5">
            <Phone size={16} className="text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">Phone</p>
              <p className="text-xs font-semibold text-foreground">
                {profile.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3.5">
            <MapPin size={16} className="text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Delivery Address
              </p>
              <p className="text-xs font-semibold text-foreground">
                {deliveryAddress || "Location not set"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAddressInput(deliveryAddress || "")
                setShowAddressEdit(true)
              }}
              className="text-primary text-xs font-semibold flex-shrink-0"
            >
              Change
            </button>
          </div>

          {/* M-Pesa Payment Section */}
          <div className="mt-2">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Smartphone size={16} className="text-primary" />
              Payment Details
            </h3>
            <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#4CAF50] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">M</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground">
                  M-Pesa Number
                </p>
                {profile.mpesaNumber ? (
                  <p className="text-xs font-semibold text-foreground">
                    {profile.mpesaNumber}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Not set up yet
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMpesaInput(profile.mpesaNumber)
                  setShowMpesaSetup(true)
                }}
                className="text-primary text-xs font-semibold"
              >
                {profile.mpesaNumber ? "Change" : "Set up"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="flex flex-col gap-4 px-5 mt-6">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-name"
              className="text-xs text-muted-foreground"
            >
              Full Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={editData.fullName}
              onChange={(e) =>
                setEditData({ ...editData, fullName: e.target.value })
              }
              className="border border-border rounded-xl px-3.5 py-3 text-sm text-foreground bg-card outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-email"
              className="text-xs text-muted-foreground"
            >
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              value={editData.email}
              onChange={(e) =>
                setEditData({ ...editData, email: e.target.value })
              }
              className="border border-border rounded-xl px-3.5 py-3 text-sm text-foreground bg-card outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-phone"
              className="text-xs text-muted-foreground"
            >
              Phone
            </label>
            <input
              id="edit-phone"
              type="tel"
              value={editData.phone}
              onChange={(e) =>
                setEditData({ ...editData, phone: e.target.value })
              }
              className="border border-border rounded-xl px-3.5 py-3 text-sm text-foreground bg-card outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-mpesa"
              className="text-xs text-muted-foreground"
            >
              M-Pesa Number
            </label>
            <input
              id="edit-mpesa"
              type="tel"
              value={editData.mpesaNumber}
              onChange={(e) =>
                setEditData({ ...editData, mpesaNumber: e.target.value })
              }
              placeholder="+254 7XX XXX XXX"
              className="border border-border rounded-xl px-3.5 py-3 text-sm text-foreground bg-card outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 border border-border text-foreground py-3 rounded-xl font-semibold text-sm hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2 bg-transparent"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Save
            </button>
          </div>
        </div>
      )}

      {/* M-Pesa Setup Modal */}
      {showMpesaSetup && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end max-w-md mx-auto">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4CAF50] flex items-center justify-center">
                  <span className="text-sm font-bold text-white">M</span>
                </div>
                M-Pesa Setup
              </h3>
              <button
                type="button"
                onClick={() => setShowMpesaSetup(false)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your M-Pesa registered phone number for payments.
            </p>
            <div className="flex flex-col gap-1.5 mb-4">
              <label
                htmlFor="mpesa-number"
                className="text-xs font-medium text-foreground"
              >
                M-Pesa Phone Number
              </label>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3.5 py-3 focus-within:border-primary transition-colors">
                <div className="flex items-center gap-1.5 flex-shrink-0 border-r border-border pr-2">
                  <span className="text-sm font-semibold text-foreground">
                    +254
                  </span>
                </div>
                <input
                  id="mpesa-number"
                  type="tel"
                  value={mpesaInput.replace("+254 ", "").replace("+254", "")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9\s]/g, "")
                    setMpesaInput(`+254 ${val}`)
                  }}
                  placeholder="7XX XXX XXX"
                  className="flex-1 text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/50"
                  maxLength={12}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                You will receive an M-Pesa STK push when placing an order.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveMpesa}
              disabled={mpesaInput.replace("+254 ", "").trim().length < 9}
              className="w-full bg-[#4CAF50] text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Smartphone size={16} />
              Save M-Pesa Number
            </button>
          </div>
        </div>
      )}

      {/* Address Edit Modal */}
      {showAddressEdit && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end max-w-md mx-auto">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MapPin size={18} className="text-primary" />
                Delivery Address
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressEdit(false)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your delivery address manually.
            </p>
            <div className="flex flex-col gap-1.5 mb-4">
              <label
                htmlFor="address-input"
                className="text-xs font-medium text-foreground"
              >
                Address
              </label>
              <textarea
                id="address-input"
                rows={3}
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="e.g. 123 Kenyatta Avenue, Nairobi"
                className="border border-border rounded-xl px-3.5 py-3 text-sm text-foreground bg-card outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (onSetManualLocation && addressInput.trim()) {
                  const city = addressInput.split(",")[0]?.trim() || addressInput.trim()
                  onSetManualLocation(city, addressInput.trim())
                }
                setShowAddressEdit(false)
              }}
              disabled={!addressInput.trim()}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <MapPin size={16} />
              Save Address
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!editing && (
        <div className="flex flex-col gap-3 px-5 mt-6">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full border border-primary text-primary py-3 rounded-xl font-semibold text-sm hover:bg-primary/5 transition-colors bg-transparent flex items-center justify-center gap-2"
          >
            <Edit3 size={16} />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full border border-destructive text-destructive py-3 rounded-xl font-semibold text-sm hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2 bg-transparent"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
