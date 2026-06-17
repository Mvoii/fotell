"use client";

import { useState } from "react";
import { useRegister } from "@/hooks/useRegister";
import type { RegisterRequest } from "@/lib/api/types/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * RegisterForm
 * - Consumes useRegister hook
 * - Inline validation, error display
 * - On success: redirects to /home, triggers welcome toast
 */
export function RegisterForm() {
  //   const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const router = useRouter();
  const { register, loading, error } = useRegister();
  const [form, setForm] = useState<RegisterRequest>({
    email: "",
    password: "",
    username: "",
    full_name: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Simple inline validation
  const validate = (values: RegisterRequest) => {
    const errors: Record<string, string> = {};
    if (!values.full_name.trim()) errors.full_name = "Full name is required";
    if (!values.username.trim()) errors.username = "Username is required";
    if (!values.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^@]+@[^@]+\.[^@]+$/.test(values.email)) {
      errors.email = "Invalid email address";
    }

    if (!values.password) {
      errors.password = "Password is required";
    } else {
      if (values.password.length < 8)
        errors.password = "Password must be at least 8 characters";
      else if (!/\d/.test(values.password))
        errors.password = "Password must contain a number";
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
    const res = await register(form);
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
        <h2 className="mt-2 heading-lg text-primary">Create an account</h2>
        <p className="text-body-md text-accent-blue mt-2">Start with 5,000 KES free</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="full_name" className="block text-body-sm font-medium text-text-primary mb-1">Full Name</label>
        <Input
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          autoComplete="name"
          required
          aria-invalid={!!fieldErrors.full_name}
        />
        {fieldErrors.full_name && (
          <div className="text-error text-sm mt-1">{fieldErrors.full_name}</div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="block text-body-sm font-medium text-text-primary mb-1">Username</label>
        <Input
          name="username"
          value={form.username}
          onChange={handleChange}
          autoComplete="username"
          required
          aria-invalid={!!fieldErrors.username}
        />
        {fieldErrors.username && (
          <div className="text-error text-sm mt-1">{fieldErrors.username}</div>
        )}
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
            autoComplete="new-password"
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
        <div className="text-body-sm text-muted-foreground mt-1">✓ 8+ chars  ✓ Has number</div>
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
        Create Account
      </Button>

      <div className="text-center text-body-sm mt-6 text-text-secondary">
        Already have an account?{" "}
        <a
          href="/auth/login"
          className="text-accent-blue hover:text-accent-blue-hover font-medium hover:underline transition-colors"
        >
          Sign in →
        </a>
      </div>
    </form>
  );
}