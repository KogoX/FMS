import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminPage() {
  // Auth and admin role check happens in middleware
  return <AdminDashboard />
}
