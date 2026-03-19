"use client";

import { useState } from "react";
import { useRegister } from "@/hooks/useRegister";
import type { RegisterRequest } from "@/lib/api/types/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * RegisterForm
 * - Consumes useRegister hook
 * - Inline validation, error display
 * - On success: redirects to /home, triggers welcome toast
 */
export function RegisterForm() {
  const router = useRouter();
  const { register, loading, error } = useRegister();
  const [form, setForm] = useState<RegisterRequest>({
    email: "",
    password: "",
    username: "",
    full_name: "",
  });
//   const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

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
    // setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(form);
    // setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const res = await register(form);
    if (res) {
      router.push("/home");
    }
  };

  return (
    <form
      className="bg-surface rounded-lg shadow-lg p-6 max-w-md mx-auto space-y-4"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <div className="text-center mb-2">
        <span className="text-accent font-bold text-2xl">🔮 FoTell</span>
        <div className="text-heading-lg mt-2">Create your account</div>
        <div className="text-body-md text-secondary">Start with 5,000 KES free</div>
      </div>

      <Input
        // label="Full Name"
        name="full_name"
        value={form.full_name}
        onChange={handleChange}
        // error={fieldErrors.full_name}
        autoComplete="name"
        required
      />

      <Input
        // label="Username"
        name="username"
        value={form.username}
        onChange={handleChange}
        // error={fieldErrors.username}
        autoComplete="username"
        required
      />

      <Input
        // label="Email"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        // error={fieldErrors.email}
        autoComplete="email"
        required
      />

      <Input
        // label="Password"
        name="password"
        type="password"
        value={form.password}
        onChange={handleChange}
        // error={fieldErrors.password}
        autoComplete="new-password"
        required
        // hint="✓ 8+ chars  ✓ Has number"
      />

      {error && (
        <div className="text-error text-sm mt-2">{error}</div>
      )}

      <Button
        // variant="primary"
        size="lg"
        type="submit"
        // loading={loading}
        // fullWidth
        disabled={loading}
      >
        Create Account
      </Button>

      <div className="text-center text-body-sm mt-4">
        Already have an account?{" "}
        <a
          href="/auth/login"
          className="text-accent hover:underline"
        >
          Sign in →
        </a>
      </div>
    </form>
  );
}