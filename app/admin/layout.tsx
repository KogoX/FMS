import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Dashboard | Food Grove",
  description: "Manage your food ordering business",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
