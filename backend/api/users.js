import express from "express";
import { db } from "../lib/db.js";
import { users } from "../../shared/schema.ts";
import { eq, ne } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = express.Router();

// Get current user
router.get("/me", requireAuth, (req, res) => {
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

// Get all users (admin only)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const allUsers = await db
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

// Get user by ID (admin only)
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        leaveBalance: users.leaveBalance,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Update user leave balance (admin only)
router.patch("/:id/leave-balance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveBalance } = req.body;

    if (typeof leaveBalance !== "number" || leaveBalance < 0) {
      return res.status(400).json({ message: "Invalid leave balance" });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ leaveBalance })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        leaveBalance: users.leaveBalance,
      });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating leave balance:", error);
    res.status(500).json({ message: "Failed to update leave balance" });
  }
});

export default router;
