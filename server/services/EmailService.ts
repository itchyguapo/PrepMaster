import { Resend } from "resend";

export class EmailService {
    private static resend = process.env.RESEND_API_KEY
        ? new Resend(process.env.RESEND_API_KEY)
        : null;

    private static fromEmail = "PrepMaster <notifications@prepmaster.com>"; // Ideally verify a domain in Resend and use it

    /**
     * Send warning email 3 days before expiration
     */
    static async sendSubscriptionExpiringWarning(email: string, username: string, daysLeft: number = 3) {
        if (!this.resend) {
            console.warn("[EmailService] RESEND_API_KEY not set. Skipping email.");
            return;
        }

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: email,
                subject: `Start Preparing! Your PrepMaster Subscription Ends in ${daysLeft} Days`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi ${username},</h2>
            <p>Your PrepMaster subscription is set to expire in <strong>${daysLeft} days</strong>.</p>
            <p>Don't let your exam prep stop! Renew your plan now to keep accessing:</p>
            <ul>
              <li>Unlimited CBT Practice Exams</li>
              <li>Detailed Performance Analytics</li>
              <li>Offline Mode</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL || 'https://prepmaster.ng'}/pricing" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renew Subscription</a></p>
            <p>Keep crushing your goals!<br/>- The PrepMaster Team</p>
          </div>
        `,
            });

            if (error) {
                console.error("[EmailService] Failed to send warning email:", error);
            } else {
                console.log(`[EmailService] Sent expiration warning to ${email}`);
            }
        } catch (err) {
            console.error("[EmailService] Error sending email:", err);
        }
    }

    /**
     * Send notification when subscription has expired
     */
    static async sendSubscriptionExpiredNotice(email: string, username: string) {
        if (!this.resend) {
            console.warn("[EmailService] RESEND_API_KEY not set. Skipping email.");
            return;
        }

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: email,
                subject: "Your PrepMaster Subscription Has Expired",
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi ${username},</h2>
            <p>Your PrepMaster subscription has just expired.</p>
            <p>You've been switched to the Basic plan. To regain access to Premium features like unlimited exams and offline downloads, please renew your subscription.</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://prepmaster.ng'}/pricing" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renew Now</a></p>
            <p>Best,<br/>- The PrepMaster Team</p>
          </div>
        `,
            });

            if (error) {
                console.error("[EmailService] Failed to send expired notice:", error);
            } else {
                console.log(`[EmailService] Sent expired notice to ${email}`);
            }
        } catch (err) {
            console.error("[EmailService] Error sending email:", err);
        }
    }
}
