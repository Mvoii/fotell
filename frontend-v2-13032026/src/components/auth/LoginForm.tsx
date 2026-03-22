"use client";

import { useState } from "react";
import { useLogin } from "@/hooks/useLogin";
import type { LoginRequest } from "@/lib/api/types/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
  const [rememberMe, setRememberMe] = useState(false);

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
    const res = await login(form, rememberMe);
    if (res) {
      router.push("/home");
    }
  };

  return (
    <form
      className="bg-surface rounded-lg shadow-lg p-6 max-w-md mx-auto space-y-6"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <div className="text-center mb-4">
        <span className="font-bold text-2xl text-accent-blue">🔮 FoTell</span>
        <div className="mt-2 text-heading-lg text-primary font-semibold">Welcome back</div>
        <div className="text-body-md text-primary mt-1">Sign in to your account</div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-heading-md text-primary mb-1">Email</label>
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
        <label htmlFor="password" className="block text-heading-md text-primary mb-1">Password</label>
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
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-primary focus:outline-none"
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

      <div className="flex items-center gap-2 mt-2">
        <input
          id="rememberMe"
          type="checkbox"
          checked={rememberMe}
          onChange={e => setRememberMe(e.target.checked)}
          className="accent-accent-blue"
        />
        <label htmlFor="rememberMe" className="text-body-sm text-primary select-none cursor-pointer">
          Remember me
        </label>
      </div>

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
