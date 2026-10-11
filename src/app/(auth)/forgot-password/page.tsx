"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast("Password reset instructions sent!", "success");
      } else {
        const data = await res.json().catch(() => null);
        toast(data?.error?.message || "Failed to process request", "error");
      }
    } catch (err) {
      toast("Error processing request. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Reset your password</h2>
        <p className="text-xs text-text-muted mt-1">
          Enter your registered email to receive password reset instructions
        </p>
      </div>

      {submitted ? (
        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-zinc-800 border border-orange-200 dark:border-zinc-700 text-xs text-text-primary space-y-2">
          <p className="font-semibold text-[#B85A12] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            Check your inbox
          </p>
          <p className="text-text-muted leading-relaxed">
            If an account exists for <strong className="text-text-primary">{email}</strong>, we have sent a secure link to reset your password. Please check your inbox and spam folder.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="text-xs"
            >
              Send another link
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={100}
          />

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2">
            <Mail className="w-4 h-4 mr-1.5" /> Send Reset Link
          </Button>
        </form>
      )}

      <div className="text-center text-xs text-text-muted border-t border-orange-100 dark:border-zinc-800 pt-4">
        <Link href="/login" className="font-semibold text-[#B85A12] hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
