import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Login — FoTell",
  description: "Sign in to your FoTell account",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
