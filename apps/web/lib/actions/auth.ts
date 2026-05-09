"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Sign in with email and password
 * Returns JWT session and redirects to appropriate dashboard
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Authentication failed",
      };
    }

    if (!data.session) {
      return { success: false, error: "No session returned from auth" };
    }

    // Session automatically set in cookies by Supabase SSR
    return { success: true, message: "Signed in successfully" };
  } catch (error) {
    console.error("[signIn]", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Sign up with email and password
 * Creates user, inserts profile with default role 'attendee', handles JWT
 */
export async function signUp(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> {
  try {
    if (!email || !password) {
      return {
        success: false,
        error: "Email and password are required",
      };
    }

    const supabase = await createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return {
        success: false,
        error: authError.message || "Sign up failed",
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: "User creation failed",
      };
    }

    // 2. Insert profile with default role 'ATTENDEE'
    const { error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName || email.split("@")[0],
          role: "ATTENDEE",
        },
      ]);

    if (profileError) {
      console.error("[signUp] Profile creation failed:", profileError);
      return {
        success: false,
        error: "Profile creation failed. Please try again.",
      };
    }

    return {
      success: true,
      message: "Account created successfully. Please check your email to confirm.",
    };
  } catch (error) {
    console.error("[signUp]", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Sign out: clears session and redirects to login
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[signOut]", error);
  }

  redirect("/login");
}

/**
 * Get current user session from cookies
 */
export async function getSession() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error("[getSession]", error);
    return null;
  }
}

/**
 * Get current user's role from profiles table
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[getUserRole]", error);
      return null;
    }

    return data?.user_role || null;
  } catch (error) {
    console.error("[getUserRole]", error);
    return null;
  }
}
