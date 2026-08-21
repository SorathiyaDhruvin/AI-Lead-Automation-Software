import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { generateToken } from "./auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export function setupGoogleOAuth(app: Express) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn("[google-oauth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google Sign-In disabled.");
    return;
  }

  const host = process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
  const callbackURL = `https://${host}/api/auth/google/callback`;

  console.log("[google-oauth] Initialised. Callback URL:", callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile: Profile, done) => {
        try {
          console.log("[google-oauth] Profile received:", {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value,
          });

          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || profile.name?.givenName || "User";
          const googleId = profile.id;

          if (!email) {
            console.error("[google-oauth] No email in Google profile");
            return done(new Error("No email found in Google profile"), undefined);
          }

          let user = await storage.getUserByEmail(email);

          if (!user) {
            const role = email.trim().toLowerCase() === "sorathiyadhruvin2005@gmail.com" ? "admin" : "user";
            console.log("[google-oauth] Creating new user for:", email, "with role:", role);
            user = await storage.createUser({
              email,
              password: "",
              firstName: profile.name?.givenName || profile.displayName || "Google User",
              lastName: profile.name?.familyName || "",
              role: role,
            });
            console.log("[google-oauth] User created, id:", user.id);
          } else {
            console.log("[google-oauth] Existing user found, id:", user.id);
          }

          return done(null, user);
        } catch (error) {
          console.error("[google-oauth] Strategy error:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  app.use(passport.initialize());

  // Diagnostic endpoint — check OAuth config without triggering a login
  app.get("/api/auth/google/status", (_req: Request, res: Response) => {
    res.json({
      configured: true,
      callbackURL,
      clientIdPrefix: GOOGLE_CLIENT_ID?.slice(0, 12) + "...",
      note: "If Google login returns 403, add your email to Test Users in Google Cloud Console → OAuth consent screen, and add this origin to Authorized JavaScript origins.",
    });
  });

  // Step 1 — Redirect to Google
  app.get("/api/auth/google", (req: Request, res: Response, next: NextFunction) => {
    console.log("[google-oauth] Login initiated, redirecting to Google...");
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
    })(req, res, next);
  });

  // Step 2 — Google calls back here after user approves
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      console.log("[google-oauth] Callback hit. Query:", req.query);
      // If Google sends back an error (e.g. access_denied), log it clearly
      if (req.query.error) {
        console.error("[google-oauth] Google returned error:", req.query.error, req.query.error_description);
        return res.redirect(`/login?error=${req.query.error}`);
      }
      next();
    },
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/login?error=auth_failed",
    }),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        if (!user) {
          console.error("[google-oauth] No user on request after authentication");
          return res.redirect("/login?error=no_user");
        }

        console.log("[google-oauth] Authentication successful for:", user.email);
        const token = generateToken(user);
        console.log("[google-oauth] JWT issued, redirecting to /auth-callback");
        res.redirect(`/auth-callback?token=${token}`);
      } catch (error) {
        console.error("[google-oauth] Callback handler error:", error);
        res.redirect("/login?error=callback_failed");
      }
    }
  );
}
