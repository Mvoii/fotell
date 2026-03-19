import React from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Register — FoTell",
  description: "Create a new FoTell account",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </main>
  );
}
