import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Use the verified domain sender. The old default (onboarding@resend.dev) is
// Resend's sandbox sender and only delivers to the account owner, so real
// recipients never received these emails. Override via RESEND_FROM_EMAIL.
const RESEND_FROM_EMAIL =
    Deno.env.get("RESEND_FROM_EMAIL") || "Access Oxbridge <office@accessoxbridge.io>";

serve(async (req) => {
    try {
        const payload = await req.json();
        console.log("Notification payload received:", payload);

        const { record, type } = payload;

        if (type !== "INSERT") {
            return new Response(JSON.stringify({ message: "Not an INSERT event" }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }

        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY is not set");
            return new Response(JSON.stringify({ error: "Configuration error" }), {
                headers: { "Content-Type": "application/json" },
                status: 500,
            });
        }

        const { recipient_email, title, message } = record;

        // In-app-only notifications (e.g. 15-min reminders, and the 1-hour
        // reminders which now email via the app's branded sender) intentionally
        // carry an empty recipient_email — nothing to send here.
        if (!recipient_email) {
            return new Response(JSON.stringify({ message: "No recipient_email; in-app only" }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: RESEND_FROM_EMAIL,
                to: recipient_email,
                subject: title,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">${title}</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">${message}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #888; font-size: 14px;">This is an automated notification from Oxbridge Portal. You can view your notifications by logging into your dashboard.</p>
            <a href="https://app.accessoxbridge.io/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
          </div>
        `,
            }),
        });

        const data = await res.json();
        console.log("Resend API response:", data);

        if (!res.ok) {
            throw new Error(`Resend API error: ${JSON.stringify(data)}`);
        }

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Error in send-email-notifications:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});
