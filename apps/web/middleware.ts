import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Middleware for role-based routing
 * - Validates JWT from cookies
 * - Extracts user role from profiles table
 * - Redirects to role-appropriate dashboard
 * - Protects routes that require authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ["/", "/login", "/register"];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  try {
    // Check for auth session
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session || sessionError) {
      // No session, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get user's role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      console.error("[middleware] Profile fetch error:", profileError);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const userRole = profile.user_role;

    // Role-based route protection and redirection
    const adminRoutes = ["/admin"];
    const organizerRoutes = ["/organizer"];
    const attendeeRoutes = ["/attendee", "/events"];
    const gatekeeperRoutes = ["/gatekeeper"];

    // Check if user is trying to access a role-restricted route
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole !== "admin") {
        return NextResponse.redirect(new URL(`/${userRole}`, request.url));
      }
    } else if (organizerRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole !== "organizer" && userRole !== "admin") {
        return NextResponse.redirect(new URL(`/${userRole}`, request.url));
      }
    } else if (gatekeeperRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole !== "gatekeeper" && userRole !== "admin") {
        return NextResponse.redirect(new URL(`/${userRole}`, request.url));
      }
    } else if (attendeeRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole === "admin" || userRole === "organizer" || userRole === "gatekeeper") {
        return NextResponse.redirect(new URL(`/${userRole}`, request.url));
      }
    }

    // If accessing root and authenticated, redirect to dashboard
    if (pathname === "/") {
      const dashboardRoutes: Record<string, string> = {
        admin: "/admin",
        organizer: "/organizer",
        attendee: "/attendee",
        gatekeeper: "/gatekeeper",
      };
      const dashboard = dashboardRoutes[userRole] || "/attendee";
      return NextResponse.redirect(new URL(dashboard, request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("[middleware]", error);
    // On error, redirect to login for safety
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
