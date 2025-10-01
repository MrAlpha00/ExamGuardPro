import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface AdminCredentials {
  email: string;
  passwordHash: string;
}

interface AdminUser {
  email: string;
  role: "admin";
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminUser;
    }
  }
}

let adminCredentials: AdminCredentials | null = null;

function loadAdminCredentials(): AdminCredentials {
  if (adminCredentials) return adminCredentials;

  // Try environment variables first (for production deployments like Render)
  const envEmail = process.env.ADMIN_EMAIL;
  const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (envEmail && envPasswordHash) {
    console.log("✓ Admin credentials loaded from environment variables");
    adminCredentials = {
      email: envEmail,
      passwordHash: envPasswordHash,
    };
    return adminCredentials;
  }

  // Fallback to JSON file for local development
  const credentialsPath = join(process.cwd(), "server", "admin-credentials.json");
  
  if (existsSync(credentialsPath)) {
    try {
      const fileContent = readFileSync(credentialsPath, "utf-8");
      const data = JSON.parse(fileContent);
      
      if (!data.email || !data.passwordHash) {
        throw new Error("Invalid credentials file format");
      }
      
      console.log("✓ Admin credentials loaded from file:", credentialsPath);
      adminCredentials = {
        email: data.email,
        passwordHash: data.passwordHash,
      };
      return adminCredentials;
    } catch (error) {
      console.error("Error reading admin credentials file:", error);
      throw new Error("Failed to load admin credentials from file");
    }
  }

  throw new Error(
    "Admin credentials not found. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH environment variables, or create server/admin-credentials.json"
  );
}

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // For development, use a fallback secret (not secure for production)
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠ Using default JWT_SECRET for development. Set JWT_SECRET env var for production!");
      return "dev-secret-change-in-production-" + Date.now();
    }
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return secret;
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const credentials = loadAdminCredentials();

    // Check email match (case-insensitive)
    if (email.toLowerCase() !== credentials.email.toLowerCase()) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, credentials.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: credentials.email, role: "admin" },
      getJWTSecret(),
      { expiresIn: "7d" }
    );

    // Set httpOnly cookie
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Login successful",
      user: { email: credentials.email, role: "admin" },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
}

export function logout(req: Request, res: Response) {
  res.clearCookie("admin_token");
  res.json({ message: "Logged out successfully" });
}

export function getAuthUser(req: Request, res: Response) {
  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.json({
    email: req.admin.email,
    role: req.admin.role,
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.admin_token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, getJWTSecret()) as AdminUser;

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    console.error("Auth error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function ensureAdminUser(storage: any, adminEmail: string) {
  let adminUser = await storage.getUser(adminEmail);
  
  if (!adminUser) {
    adminUser = await storage.upsertUser({
      id: adminEmail,
      email: adminEmail,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });
    console.log("✓ Admin user created in database:", adminEmail);
  }
  
  return adminUser;
}
