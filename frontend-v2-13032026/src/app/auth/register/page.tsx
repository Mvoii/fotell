import React from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

import { AuthLeftPanel } from "@/components/auth/AuthLeftPanel";

export const metadata = {
  title: "Register — FoTell",
  description: "Create a new FoTell account",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-base">
      <AuthLeftPanel />
      <div className="flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-base to-surface pointer-events-none" />
        <div className="w-full max-w-md relative z-10 py-8">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
