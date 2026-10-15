"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  KeyRound,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Role = "ADMIN" | "EDITOR" | "VIEWER"

type WorkspaceUser = {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  lastLoginAt: string | null
}

type UserForm = {
  name: string
  email: string
  password: string
  role: Role
}

const roles: Array<{ value: Role; label: string; description: string }> = [
  { value: "ADMIN", label: "Admin", description: "Full workspace access" },
  { value: "EDITOR", label: "Editor", description: "Can manage media and screens" },
  { value: "VIEWER", label: "Viewer", description: "Can view workspace content" },
]

const emptyForm: UserForm = { name: "", email: "", password: "", role: "EDITOR" }

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value: string | null) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  )
}

function roleClass(role: Role) {
  if (role === "ADMIN") return "border-[#d9cffb] bg-[#f2efff] text-[#5633a6]"
  if (role === "EDITOR") return "border-[#bde7e3] bg-[#edfbf9] text-[#167772]"
  return "border-[#dce2eb] bg-[#f6f8fb] text-[#637083]"
}

export default function UsersPage() {
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users", { cache: "no-store" })
      const payload = (await response.json()) as { users?: WorkspaceUser[]; error?: string }

      if (!response.ok) throw new Error(payload.error ?? "Unable to load users")
      setUsers(payload.users ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load users")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 0)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query))
  }, [search, users])

  const admins = users.filter((user) => user.role === "ADMIN").length
  const editors = users.filter((user) => user.role === "EDITOR").length

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const payload = (await response.json()) as { user?: WorkspaceUser; error?: string }
      if (!response.ok || !payload.user) throw new Error(payload.error ?? "Unable to add user")

      setUsers((current) => [...current, payload.user!].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(emptyForm)
      setIsAddOpen(false)
      toast.success(`${payload.user.name} has been added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add user")
    } finally {
      setIsSaving(false)
    }
  }

  async function updateUser(userId: string, values: Partial<Pick<UserForm, "name" | "password" | "role">>) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const payload = (await response.json()) as { user?: WorkspaceUser; error?: string }
      if (!response.ok || !payload.user) throw new Error(payload.error ?? "Unable to update user")

      setUsers((current) => current.map((user) => (user.id === userId ? payload.user! : user)))
      toast.success("User updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user")
      await loadUsers()
    }
  }

  async function resetPassword(user: WorkspaceUser) {
    const password = window.prompt(`Enter a new password for ${user.name}. It must be at least 6 characters.`)
    if (password === null) return
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setOpenMenu(null)
    await updateUser(user.id, { password })
  }

  async function removeUser(user: WorkspaceUser) {
    if (!window.confirm(`Remove ${user.name} from this workspace?`)) return
    setOpenMenu(null)

    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Unable to remove user")

      setUsers((current) => current.filter((item) => item.id !== user.id))
      toast.success(`${user.name} has been removed`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove user")
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <section className="mb-7 flex flex-col gap-5 border-b border-[#e4e8ee] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6957b7]">Workspace access</p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#111827]">Users</h1>
            <p className="mt-2 text-sm text-[#6b7280]">Manage who can access the Amagi Multimedia workspace.</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="h-10 gap-2 rounded-lg bg-[#16125e] px-5 text-sm font-semibold hover:bg-[#0f0c49]">
            <Plus className="size-4" />
            Add user
          </Button>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <Metric icon={Users} label="Total users" value={String(users.length)} detail="People with workspace access" />
          <Metric icon={ShieldCheck} label="Administrators" value={String(admins)} detail="Can manage users and permissions" />
          <Metric icon={UserCheck} label="Editors" value={String(editors)} detail="Can manage media and screens" />
        </section>

        <section className="overflow-visible rounded-2xl border border-[#e4e8ee] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 border-b border-[#e8ebf0] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#18212f]">Workspace members</h2>
              <p className="mt-1 text-sm text-[#7b8492]">Roles control access to workspace management features.</p>
            </div>
            <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#dfe4eb] bg-[#fbfcfd] px-3 text-[#818a99] sm:w-[270px]">
              <Search className="size-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="w-full bg-transparent text-sm text-[#263244] outline-none placeholder:text-[#99a2b0]" />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-[#fafbfc] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8795]">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Last active</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="w-16 px-5 py-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f4]">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#7b8492]">Loading workspace members…</td></tr>
                ) : visibleUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#7b8492]">No users match your search.</td></tr>
                ) : visibleUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-[#fbfcff]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-full bg-[#eae7fb] text-xs font-bold text-[#42318f]">{initials(user.name)}</div>
                        <div>
                          <p className="text-sm font-semibold text-[#1e2939]">{user.name}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7c8797]"><Mail className="size-3" />{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <label className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${roleClass(user.role)}`}>
                        <select value={user.role} onChange={(event) => void updateUser(user.id, { role: event.target.value as Role })} className="appearance-none bg-transparent pr-1 outline-none">
                          {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                        <ChevronDown className="size-3 opacity-70" />
                      </label>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#566275]">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-5 py-4 text-sm text-[#566275]">{formatDate(user.createdAt)}</td>
                    <td className="relative px-5 py-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setOpenMenu((current) => current === user.id ? null : user.id)} className="size-8 text-[#657185] hover:bg-[#eef1f7] hover:text-[#1d2635]">
                        <MoreHorizontal className="size-4" />
                      </Button>
                      {openMenu === user.id && (
                        <div className="absolute right-5 top-12 z-10 w-44 rounded-lg border border-[#e1e5eb] bg-white p-1.5 text-left shadow-lg">
                          <button onClick={() => void resetPassword(user)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#374151] hover:bg-[#f4f6f9]"><KeyRound className="size-3.5" />Reset password</button>
                          <button onClick={() => void removeUser(user)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#cc2638] hover:bg-[#fff0f1]"><Trash2 className="size-3.5" />Remove user</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-[520px] border-[#e4e8ee] bg-white p-0 text-[#18212f]">
          <form onSubmit={createUser}>
            <DialogHeader className="border-b border-[#edf0f4] px-6 py-5">
              <DialogTitle className="text-xl">Add user</DialogTitle>
              <DialogDescription className="text-[#778293]">Create a workspace account and choose its access level.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 py-5">
              <Field label="Full name"><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Priya Sharma" className="h-10 rounded-lg border border-[#dfe4eb] px-3 text-sm outline-none focus:border-[#7760ca]" /></Field>
              <Field label="Email address"><input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" className="h-10 rounded-lg border border-[#dfe4eb] px-3 text-sm outline-none focus:border-[#7760ca]" /></Field>
              <Field label="Temporary password"><input required type="password" minLength={6} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="At least 6 characters" className="h-10 rounded-lg border border-[#dfe4eb] px-3 text-sm outline-none focus:border-[#7760ca]" /></Field>
              <Field label="Role">
                <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))} className="h-10 rounded-lg border border-[#dfe4eb] bg-white px-3 text-sm outline-none focus:border-[#7760ca]">
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label} — {role.description}</option>)}
                </select>
              </Field>
            </div>
            <DialogFooter className="border-t border-[#edf0f4] px-6 py-4 sm:justify-between">
              <p className="hidden text-xs text-[#7b8492] sm:block">Admins can update or remove users.</p>
              <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button type="submit" disabled={isSaving} className="bg-[#16125e] hover:bg-[#0f0c49]">{isSaving ? "Adding…" : "Add user"}</Button></div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string; detail: string }) {
  return <article className="rounded-xl border border-[#e4e8ee] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.025)]"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#88919e]">{label}</span><span className="grid size-8 place-items-center rounded-lg bg-[#f0edff] text-[#52429d]"><Icon className="size-4" /></span></div><p className="text-3xl font-semibold tracking-[-0.03em] text-[#172033]">{value}</p><p className="mt-1 text-xs text-[#87909d]">{detail}</p></article>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-[#3f4a5a]"><span>{label}</span>{children}</label>
}
