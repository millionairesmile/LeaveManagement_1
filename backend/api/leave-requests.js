import express from "express";
import { db } from "../lib/db.js";
import { leaveRequests, users, insertLeaveRequestSchema } from "../../shared/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { sendSlackNotification } from "../lib/slack.js";
import { ZodError } from "zod";

const router = express.Router();

// Get leave requests
router.get("/", requireAuth, async (req, res) => {
  try {
    const { all } = req.query;
    const isAdmin = req.user.role === "admin";
    
    let query = db
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

// Create leave request
router.post("/", requireAuth, async (req, res) => {
  try {
    const validatedData = insertLeaveRequestSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    // Calculate number of days
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Check if user has enough leave balance
    if (req.user.leaveBalance < days) {
      return res.status(400).json({ 
        message: "Insufficient leave balance",
        required: days,
        available: req.user.leaveBalance,
      });
    }

    // Create the leave request
    const [newRequest] = await db
      .insert(leaveRequests)
      .values(validatedData)
      .returning();

    // Deduct from leave balance immediately
    await db
      .update(users)
      .set({ 
        leaveBalance: req.user.leaveBalance - days 
      })
      .where(eq(users.id, req.user.id));

    // Send Slack notification
    try {
      await sendSlackNotification({
        type: "new_request",
        employeeName: req.user.name,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        leaveType: validatedData.leaveType,
        reason: validatedData.reason,
        days,
        remainingBalance: req.user.leaveBalance - days,
      });
    } catch (slackError) {
      console.error("Failed to send Slack notification:", slackError);
      // Don't fail the request if Slack notification fails
    }

    // Fetch the complete request with user info
    const [completeRequest] = await db
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
      .where(eq(leaveRequests.id, newRequest.id))
      .limit(1);

    res.status(201).json(completeRequest);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    console.error("Error creating leave request:", error);
    res.status(500).json({ message: "Failed to create leave request" });
  }
});

// Update leave request
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertLeaveRequestSchema.omit({ userId: true }).parse(req.body);

    // Get current request
    const [currentRequest] = await db
      .select()
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.id, id),
        eq(leaveRequests.userId, req.user.id)
      ))
      .limit(1);

    if (!currentRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Only allow updates to pending requests
    if (currentRequest.status !== "pending") {
      return res.status(400).json({ 
        message: "Can only update pending requests" 
      });
    }

    // Calculate days for old and new requests
    const oldStartDate = new Date(currentRequest.startDate);
    const oldEndDate = new Date(currentRequest.endDate);
    const oldDays = Math.ceil((oldEndDate - oldStartDate) / (1000 * 60 * 60 * 24)) + 1;

    const newStartDate = new Date(validatedData.startDate);
    const newEndDate = new Date(validatedData.endDate);
    const newDays = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24)) + 1;

    const daysDifference = newDays - oldDays;

    // Check if user has enough balance for the change
    if (daysDifference > 0 && req.user.leaveBalance < daysDifference) {
      return res.status(400).json({ 
        message: "Insufficient leave balance for the change",
        required: daysDifference,
        available: req.user.leaveBalance,
      });
    }

    // Update the request
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set(validatedData)
      .where(eq(leaveRequests.id, id))
      .returning();

    // Update leave balance
    if (daysDifference !== 0) {
      await db
        .update(users)
        .set({ 
          leaveBalance: req.user.leaveBalance - daysDifference 
        })
        .where(eq(users.id, req.user.id));
    }

    // Fetch the complete updated request
    const [completeRequest] = await db
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
      .where(eq(leaveRequests.id, id))
      .limit(1);

    res.json(completeRequest);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    console.error("Error updating leave request:", error);
    res.status(500).json({ message: "Failed to update leave request" });
  }
});

// Delete leave request
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the request to calculate days to restore
    const [request] = await db
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

    // Calculate days to restore
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Delete the request
    await db
      .delete(leaveRequests)
      .where(eq(leaveRequests.id, id));

    // Restore leave balance
    await db
      .update(users)
      .set({ 
        leaveBalance: req.user.leaveBalance + days 
      })
      .where(eq(users.id, req.user.id));

    res.json({ message: "Leave request deleted successfully" });
  } catch (error) {
    console.error("Error deleting leave request:", error);
    res.status(500).json({ message: "Failed to delete leave request" });
  }
});

// Approve leave request (admin only)
router.post("/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [updatedRequest] = await db
      .update(leaveRequests)
      .set({ status: "approved" })
      .where(eq(leaveRequests.id, id))
      .returning();

    if (!updatedRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Get user info for notification
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, updatedRequest.userId))
      .limit(1);

    // Send Slack notification
    try {
      const startDate = new Date(updatedRequest.startDate);
      const endDate = new Date(updatedRequest.endDate);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      await sendSlackNotification({
        type: "approved",
        employeeName: user.name,
        startDate: updatedRequest.startDate,
        endDate: updatedRequest.endDate,
        leaveType: updatedRequest.leaveType,
        days,
        remainingBalance: user.leaveBalance,
      });
    } catch (slackError) {
      console.error("Failed to send Slack notification:", slackError);
    }

    res.json({ message: "Leave request approved" });
  } catch (error) {
    console.error("Error approving leave request:", error);
    res.status(500).json({ message: "Failed to approve leave request" });
  }
});

// Reject leave request (admin only)
router.post("/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the request to restore leave balance
    const [request] = await db
      .select()
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .where(eq(leaveRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Calculate days to restore
    const startDate = new Date(request.leaveRequests.startDate);
    const endDate = new Date(request.leaveRequests.endDate);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Update request status
    await db
      .update(leaveRequests)
      .set({ status: "rejected" })
      .where(eq(leaveRequests.id, id));

    // Restore leave balance
    await db
      .update(users)
      .set({ 
        leaveBalance: request.users.leaveBalance + days 
      })
      .where(eq(users.id, request.leaveRequests.userId));

    // Send Slack notification
    try {
      await sendSlackNotification({
        type: "rejected",
        employeeName: request.users.name,
        startDate: request.leaveRequests.startDate,
        endDate: request.leaveRequests.endDate,
        leaveType: request.leaveRequests.leaveType,
        days,
        remainingBalance: request.users.leaveBalance + days,
      });
    } catch (slackError) {
      console.error("Failed to send Slack notification:", slackError);
    }

    res.json({ message: "Leave request rejected" });
  } catch (error) {
    console.error("Error rejecting leave request:", error);
    res.status(500).json({ message: "Failed to reject leave request" });
  }
});

export default router;
