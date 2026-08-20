import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { UserLegacy } from "@shared/schema";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWT_SECRET = process.env.SESSION_SECRET || "leadflow-secret-key";
const JWT_EXPIRES_IN = "7d";

export interface AuthRequest extends Request {
  user?: UserLegacy;
}

export function generateToken(user: UserLegacy): string {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.substring(7);
  let decoded = verifyToken(token);

  if (decoded) {
    (req as any).userId = decoded.userId;
    return next();
  }

  // Try Supabase Auth as fallback securely
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://crjvsfclgevqgybuxvfa.supabase.co";
  try {
    const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, JWKS, {
      audience: "authenticated"
    });
    if (payload && payload.sub) {
      (req as any).userId = payload.sub;
      return next();
    }
  } catch (err) {
    // console.error("Supabase JWT Verification error", err);
  }
  
  return res.status(401).json({ message: "Invalid or expired token" });
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Attach userId and role to request
  (req as any).userId = decoded.userId;
  (req as any).userRole = (decoded as any).role;
  
  // Check if user has admin role
  if ((decoded as any).role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}
