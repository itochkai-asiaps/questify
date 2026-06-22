"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) => {
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        return { error: "Passwords do not match" };
      }

      if (password.length < 8) {
        return { error: "Password must be at least 8 characters" };
      }

      return signUp(formData);
    },
    undefined as { error?: string; success?: boolean } | undefined,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-center text-xl">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {state?.success ? (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-6 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 15 }}
              >
                <CheckCircle2 className="size-16 text-green-500" />
              </motion.div>

              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to your email address. Click the link to activate your account.
                </p>
              </div>

              <Link href="/login" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground w-full">
                Go to Sign In
              </Link>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              action={formAction}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        {!state?.success && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
