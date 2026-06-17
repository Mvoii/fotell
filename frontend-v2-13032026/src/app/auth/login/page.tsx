import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";

import { AuthLeftPanel } from "@/components/auth/AuthLeftPanel";

export const metadata = {
  title: "Login — FoTell",
  description: "Sign in to your FoTell account",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-base">
      <AuthLeftPanel />
      <div className="flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-base to-surface pointer-events-none" />
        <div className="w-full max-w-md relative z-10">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
