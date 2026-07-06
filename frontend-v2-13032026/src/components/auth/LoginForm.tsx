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
      className="w-full max-w-sm mx-auto space-y-6"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <div className="text-center mb-8 flex flex-col items-center">
        <Image
          src="/logo1.svg"
          alt="FoTell"
          width={120}
          height={40}
          className="object-contain mb-6 lg:hidden"
          priority
        />
        <h2 className="mt-2 heading-lg text-primary">Welcome back</h2>
        <p className="text-body-md text-text-secondary mt-2">Sign in to your account</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-body-sm font-medium text-text-primary mb-1">Email address</label>
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
        <label htmlFor="password" className="block text-body-sm font-medium text-text-primary mb-1">Password</label>
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
        className="w-full mt-4 h-12 text-base font-semibold shadow-lg hover:shadow-accent-blue/20 transition-all duration-300 hover:scale-[1.02]"
      >
        Sign In
      </Button>

      <div className="text-center text-body-sm mt-6 text-text-secondary">
        Don&apos;t have an account?{" "}
        <a
          href="/auth/register"
          className="text-accent-blue hover:text-accent-blue-hover font-medium hover:underline transition-colors"
        >
          Sign up →
        </a>
      </div>
    </form>
  );
}
