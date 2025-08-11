import express from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import { db } from "../lib/db.js";
import { users, insertUserSchema } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

const router = express.Router();

// Login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Authentication error" });
    }
    
    if (!user) {
      return res.status(401).json({ message: info?.message || "Invalid credentials" });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login error" });
      }
      
      const { password, ...userWithoutPassword } = user;
      return res.json({ 
        message: "Login successful", 
        user: userWithoutPassword 
      });
    });
  })(req, res, next);
});

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout error" });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Session destruction error" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout successful" });
    });
  });
});

// Register (for initial setup/admin use)
router.post("/register", async (req, res) => {
  try {
    const validatedData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        ...validatedData,
        password: hashedPassword,
        role: validatedData.role || "employee",
        leaveBalance: validatedData.leaveBalance || 25,
      })
      .returning();

    const { password, ...userWithoutPassword } = newUser;
    res.status(201).json({ 
      message: "User created successfully", 
      user: userWithoutPassword 
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    console.error("Registration error:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// Check authentication status
router.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

export default router;
