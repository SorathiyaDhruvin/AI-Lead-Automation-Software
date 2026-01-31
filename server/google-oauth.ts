import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { generateToken } from "./auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export function setupGoogleOAuth(app: Express) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth credentials not configured. Google Sign-In will be disabled.");
    return;
  }

  const host = process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
  const callbackURL = `https://${host}/api/auth/google/callback`;
  
  console.log("Google OAuth callback URL:", callbackURL);

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
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || profile.name?.givenName || "User";
          const googleId = profile.id;

          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          let user = await storage.getUserByEmail(email);
          
          if (!user) {
            user = await storage.createUser({
              email,
              name,
              password: `google_oauth_${googleId}`,
              company: "",
            });
          }

          return done(null, user);
        } catch (error) {
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

  app.get("/api/auth/google", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
    })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=auth_failed" }),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        if (!user) {
          return res.redirect("/login?error=no_user");
        }

        const token = generateToken(user);
        
        res.redirect(`/auth-callback?token=${token}`);
      } catch (error) {
        console.error("Google OAuth callback error:", error);
        res.redirect("/login?error=callback_failed");
      }
    }
  );
}
