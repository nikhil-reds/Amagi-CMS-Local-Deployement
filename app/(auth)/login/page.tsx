import type { Metadata } from "next"
import Link from "next/link"

import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"

export const metadata: Metadata = {
  title: "Sign in · TR Fastenings Multimedia",
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to manage your documents and screens."
      footer={
        <>
          Need access?{" "}
          <Link href="#" className="font-semibold text-[#1863dc] hover:text-[#000f93] hover:underline">
            Contact your administrator
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  )
}
