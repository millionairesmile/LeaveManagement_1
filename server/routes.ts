import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { eq, and, desc, ne } from "drizzle-orm";
import { db } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users, leaveRequests, insertUserSchema, insertLeaveRequestSchema } from "@shared/schema";

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const database = drizzle(sql);

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Passport configuration
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const [user] = await database
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.logIn(user, (err: any) => {
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

  app.post("/api/auth/logout", (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout error" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Session destruction error" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logout successful" });
      });
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const [existingUser] = await database
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
      const [newUser] = await database
        .insert(users)
        .values({
          ...validatedData,
          password: hashedPassword,
        })
        .returning();

      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // User routes
  app.get("/api/users/me", requireAuth, (req: any, res) => {
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allUsers = await database
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          leaveBalance: users.leaveBalance,
          createdAt: users.createdAt,
        })
        .from(users);

      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Leave request routes
  app.get("/api/leave-requests", requireAuth, async (req: any, res) => {
    try {
      const { all } = req.query;
      const isAdmin = req.user.role === "admin";
      
      let query = database
        .select({
          id: leaveRequests.id,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          leaveType: leaveRequests.leaveType,
          reason: leaveRequests.reason,
          status: leaveRequests.status,
          createdAt: leaveRequests.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(leaveRequests)
        .innerJoin(users, eq(leaveRequests.userId, users.id))
        .orderBy(desc(leaveRequests.createdAt));

      // If not admin or not requesting all, filter by user
      if (!isAdmin || all !== "true") {
        query = query.where(eq(leaveRequests.userId, req.user.id));
      }

      const requests = await query;
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.post("/api/leave-requests", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertLeaveRequestSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      // Calculate number of days
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Check if user has enough leave balance
      if (req.user.leaveBalance < days) {
        return res.status(400).json({ 
          message: "Insufficient leave balance",
          required: days,
          available: req.user.leaveBalance,
        });
      }

      // Create the leave request and update user balance
      const [newRequest] = await database
        .insert(leaveRequests)
        .values(validatedData)
        .returning();

      // Update user's leave balance
      await database
        .update(users)
        .set({ 
          leaveBalance: req.user.leaveBalance - days 
        })
        .where(eq(users.id, req.user.id));

      res.status(201).json({
        message: "Leave request submitted successfully",
        request: newRequest
      });
    } catch (error: any) {
      console.error("Error creating leave request:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create leave request" });
    }
  });

  app.post("/api/leave-requests/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const [updatedRequest] = await database
        .update(leaveRequests)
        .set({ status: "approved" })
        .where(eq(leaveRequests.id, id))
        .returning();

      if (!updatedRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      res.json({
        message: "Leave request approved successfully",
        request: updatedRequest
      });
    } catch (error) {
      console.error("Error approving leave request:", error);
      res.status(500).json({ message: "Failed to approve leave request" });
    }
  });

  app.post("/api/leave-requests/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Get the request details first
      const [request] = await database
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, id))
        .limit(1);

      if (!request) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      // Calculate days to restore to user balance
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Update request status to rejected
      const [updatedRequest] = await database
        .update(leaveRequests)
        .set({ status: "rejected" })
        .where(eq(leaveRequests.id, id))
        .returning();

      // Restore user's leave balance
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (user) {
        await database
          .update(users)
          .set({ 
            leaveBalance: user.leaveBalance + days 
          })
          .where(eq(users.id, request.userId));
      }

      res.json({
        message: "Leave request rejected successfully",
        request: updatedRequest
      });
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      res.status(500).json({ message: "Failed to reject leave request" });
    }
  });

  app.delete("/api/leave-requests/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get the request details first
      const [request] = await database
        .select()
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.id, id),
          eq(leaveRequests.userId, req.user.id)
        ))
        .limit(1);

      if (!request) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      // Calculate days to restore to user balance
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Delete the request
      await database
        .delete(leaveRequests)
        .where(eq(leaveRequests.id, id));

      // Restore user's leave balance
      await database
        .update(users)
        .set({ 
          leaveBalance: req.user.leaveBalance + days 
        })
        .where(eq(users.id, req.user.id));

      res.json({
        message: "Leave request deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting leave request:", error);
      res.status(500).json({ message: "Failed to delete leave request" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
