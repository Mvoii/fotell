"use client";

import { useState } from "react";
import { useLogin } from "@/hooks/useLogin";
import type { LoginRequest } from "@/lib/api/types/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * LoginForm
 * - Consumes useLogin hook
 * - Inline validation, error display
 * - On success: redirects to /home, triggers welcome toast
 */
export function LoginForm() {
  const router = useRouter();
  const { login, loading, error } = useLogin();
  const [form, setForm] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Simple inline validation
  const validate = (values: LoginRequest) => {
    const errors: Record<string, string> = {};
    if (!values.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^@]+@[^@]+\.[^@]+$/.test(values.email)) {
      errors.email = "Invalid email address";
    }
    if (!values.password) {
      errors.password = "Password is required";
    }
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const res = await login(form);
    if (res) {
      router.push("/portfolio");
    }
  };

  return (
    <form
      className="bg-elevated border border-subtle rounded-xl shadow-2xl p-8 max-w-md mx-auto space-y-6"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <div className="text-center mb-4 flex flex-col items-center">
        <Image
          src="/logo1.svg"
          alt="FoTell"
          width={120}
          height={40}
          className="object-contain mb-2"
          priority
        />
        <div className="mt-2 text-heading-lg text-foreground font-semibold">Welcome back</div>
        <div className="text-body-md text-muted-foreground mt-1">Sign in to your account</div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-heading-md text-foreground mb-1">Email</label>
        <Input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <div className="text-error text-sm mt-1">{fieldErrors.email}</div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-heading-md text-foreground mb-1">Password</label>
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
            aria-invalid={!!fieldErrors.password}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-primary focus:outline-none"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>
        {fieldErrors.password && (
          <div className="text-error text-sm mt-1">{fieldErrors.password}</div>
        )}
      </div>

      {error && (
        <div className="text-error text-sm mt-2 text-center">{error}</div>
      )}



      <Button
        variant="default"
        size="lg"
        type="submit"
        disabled={loading}
        className="w-full mt-2"
      >
        Sign In
      </Button>

      <div className="text-center text-body-sm mt-4">
        Don&apos;t have an account?{" "}
        <a
          href="/auth/register"
          className="text-accent-blue hover:underline"
        >
          Sign up →
        </a>
      </div>
    </form>
  );
}
