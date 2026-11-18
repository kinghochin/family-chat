"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction } from "@/app/auth-actions";

type AuthState = { ok: boolean; error?: string; message?: string };

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, { ok: false });
  const isSignup = mode === "signup";

  return <main className="auth-page"><div className="auth-card"><Link className="family-logo auth-logo" href="/"><span>✦</span> Gatherly</Link><span className="family-overline">THE HARRIS FAMILY</span><h1>{isSignup ? "Create your account" : "Welcome back"}</h1><p className="auth-intro">{isSignup ? "Join your family space and keep every conversation useful." : "Sign in to your family conversation space."}</p><form className="auth-form" action={formAction}>{isSignup && <label>Display name<input name="display_name" autoComplete="name" placeholder="Jamie Chen" required /></label>}<label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} placeholder="At least 8 characters" required /></label><button className="primary-button" type="submit" disabled={pending}>{pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}</button></form>{state.error && <p className="auth-message error" role="alert">{state.error}</p>}{state.message && <p className="auth-message success" role="status">{state.message}</p>}<p className="auth-switch">{isSignup ? "Already have an account?" : "New to Gatherly?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p></div></main>;
}
