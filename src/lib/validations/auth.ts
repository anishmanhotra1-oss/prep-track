import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(70, "Name cannot exceed 70 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(100, "Email cannot exceed 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters"),
  timezone: z.string().max(60).optional().default("UTC"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(100, "Email cannot exceed 100 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password cannot exceed 128 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128, "New password cannot exceed 128 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(100, "Email cannot exceed 100 characters"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").max(128),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128, "New password cannot exceed 128 characters"),
});

export const deleteAccountSchema = z.object({
  confirmText: z.string().refine((val) => val === "DELETE", {
    message: "Must type DELETE to confirm",
  }),
});
