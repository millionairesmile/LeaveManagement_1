import { WebClient } from "@slack/web-api";

const slack = new WebClient(
  process.env.SLACK_BOT_TOKEN || process.env.SLACK_WEBHOOK_URL || ""
);

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || "#general";

export async function sendSlackNotification(data) {
  // If no Slack configuration, skip silently
  if (!process.env.SLACK_BOT_TOKEN && !process.env.SLACK_WEBHOOK_URL) {
    console.log("Slack not configured, skipping notification");
    return;
  }

  try {
    const { type, employeeName, startDate, endDate, leaveType, reason, days, remainingBalance } = data;
    
    let message = "";
    let color = "#36a64f"; // green

    switch (type) {
      case "new_request":
        message = `🗓️ *New Leave Request*\n\n*Employee:* ${employeeName}\n*Dates:* ${startDate} to ${endDate} (${days} days)\n*Type:* ${leaveType}\n*Reason:* ${reason}\n*Remaining Balance:* ${remainingBalance} days`;
        color = "#ffaa00"; // orange
        break;
      
      case "approved":
        message = `✅ *Leave Request Approved*\n\n*Employee:* ${employeeName}\n*Dates:* ${startDate} to ${endDate} (${days} days)\n*Type:* ${leaveType}\n*Remaining Balance:* ${remainingBalance} days`;
        color = "#36a64f"; // green
        break;
      
      case "rejected":
        message = `❌ *Leave Request Rejected*\n\n*Employee:* ${employeeName}\n*Dates:* ${startDate} to ${endDate} (${days} days)\n*Type:* ${leaveType}\n*Balance Restored:* ${remainingBalance} days`;
        color = "#ff0000"; // red
        break;
      
      default:
        message = `📋 Leave request update for ${employeeName}`;
    }

    const result = await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      text: message,
      attachments: [
        {
          color: color,
          text: message,
          ts: Math.floor(Date.now() / 1000),
        }
      ],
    });

    console.log("Slack notification sent successfully:", result.ts);
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    // Re-throw if it's a critical error, otherwise just log
    if (error.code === "not_authed") {
      throw new Error("Slack authentication failed - check SLACK_BOT_TOKEN");
    }
  }
}
