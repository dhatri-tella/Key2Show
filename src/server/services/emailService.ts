import { db } from '../db.ts';

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmailViaResend(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.log('[Resend Email Service] RESEND_API_KEY is not configured in process.env. Email delivery queued as PENDING.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Key2Show <bookings@resend.dev>';
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = (data as { message?: string })?.message || `Resend HTTP ${response.status}`;
      console.warn(`[Resend Email Service] Delivery failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    const emailId = (data as { id?: string })?.id;
    console.log(`[Resend Email Service] Email sent successfully via Resend: ${emailId}`);
    return { success: true, id: emailId };
  } catch (err) {
    const errMsg = (err as Error).message;
    console.warn(`[Resend Email Service] Exception during email dispatch: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

export async function dispatchBookingConfirmationEmail(bookingId: string): Promise<void> {
  try {
    const booking = db
      .prepare(`
        SELECT b.*, u.email as booker_email, u.name as booker_name
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        WHERE b.id = ?
      `)
      .get(bookingId) as Record<string, string | number | null> | undefined;

    if (!booking) return;

    const seats = db
      .prepare("SELECT label FROM booking_items WHERE booking_id = ? AND item_type = 'SEAT'")
      .all(bookingId) as { label: string }[];
    const seatNames = seats.map((s) => s.label.replace(/^Seat\s+/i, '')).join(', ') || 'General Admission';

    const foodItems = db
      .prepare(`
        SELECT foi.name, foi.quantity, foi.total_price
        FROM food_order_items foi
        JOIN food_orders fo ON fo.id = foi.food_order_id
        WHERE fo.booking_id = ?
      `)
      .all(bookingId) as { name: string; quantity: number; total_price: number }[];

    const foodHtml = foodItems.length > 0
      ? `<div style="margin-top: 16px; padding: 12px; background: #16161d; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
          <strong style="color: #FF252E; font-size: 13px;">Pre-Ordered Food &amp; Beverages:</strong>
          <ul style="margin: 8px 0 0; padding-left: 18px; color: #ddd; font-size: 13px;">
            ${foodItems.map((f) => `<li>${f.name} × ${f.quantity} (₹${f.total_price})</li>`).join('')}
          </ul>
        </div>`
      : '';

    const companions = db
      .prepare('SELECT companion_name, relation, verification_status FROM companion_access WHERE booking_id = ?')
      .all(bookingId) as { companion_name: string; relation: string; verification_status: string }[];

    const companionHtml = companions.length > 0
      ? `<div style="margin-top: 14px; padding: 12px; background: #16161d; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
          <strong style="color: #4ade80; font-size: 13px;">Shared Companions (Same 1 Booking QR):</strong>
          <ul style="margin: 8px 0 0; padding-left: 18px; color: #ccc; font-size: 12px;">
            ${companions.map((c) => `<li>${c.companion_name} (${c.relation}) — ${c.verification_status}</li>`).join('')}
          </ul>
        </div>`
      : '';

    const recipientEmail = String(booking.booker_email || '');
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Key2Show Booking Confirmation</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #050505; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0e0e13; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="padding: 24px 30px; background: linear-gradient(135deg, #18080a 0%, #0e0e13 100%); border-bottom: 2px solid #E50914;">
                <h1 style="margin: 0; font-size: 24px; color: #E50914; letter-spacing: -0.5px;">Key2Show</h1>
                <p style="margin: 4px 0 0; font-size: 12px; color: #a1a1aa;">Your Entertainment. Your Ticket. Your Show.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px;">
                <div style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 10px; padding: 12px 16px; margin-bottom: 24px;">
                  <h2 style="margin: 0; font-size: 16px; color: #4ade80;">✓ Booking Confirmed &amp; Paid</h2>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #bbf7d0;">Booking Code: <strong>${booking.booking_code}</strong></p>
                </div>

                <h3 style="margin: 0 0 8px; font-size: 20px; color: #ffffff;">${booking.movie_title}</h3>
                <p style="margin: 0 0 16px; font-size: 14px; color: #a1a1aa;">${booking.theatre_name} · ${booking.screen_name}</p>

                <table width="100%" cellpadding="6" cellspacing="0" style="background: #14141a; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                  <tr>
                    <td style="color: #71717a;">Date &amp; Time</td>
                    <td style="color: #f4f4f5; text-align: right; font-weight: 600;">${booking.show_date} · ${booking.show_time}</td>
                  </tr>
                  <tr>
                    <td style="color: #71717a;">Format</td>
                    <td style="color: #f4f4f5; text-align: right; font-weight: 600;">${booking.format}</td>
                  </tr>
                  <tr>
                    <td style="color: #71717a;">Seats</td>
                    <td style="color: #f4f4f5; text-align: right; font-weight: 600;">${seatNames}</td>
                  </tr>
                  <tr>
                    <td style="color: #71717a;">Total Amount</td>
                    <td style="color: #E50914; text-align: right; font-size: 16px; font-weight: 800;">₹${booking.total_amount}</td>
                  </tr>
                </table>

                ${foodHtml}
                ${companionHtml}

                <div style="margin-top: 24px; padding: 16px; background: #191012; border: 1px dashed #FF252E; border-radius: 12px; text-align: center;">
                  <p style="margin: 0 0 4px; font-size: 13px; font-weight: bold; color: #FF4A52;">ONE BOOKING = ONE QR CODE</p>
                  <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Show your single booking QR pass at the cinema turnstile for entry for all attendees.</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 30px; background-color: #09090c; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: #71717a; text-align: center;">
                Need help or wish to modify companions? Open Key2Show &gt; My Bookings.<br />
                &copy; ${new Date().getFullYear()} Key2Show. All rights reserved.
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const res = await sendEmailViaResend({
      to: recipientEmail,
      subject: `Key2Show Booking Confirmation: ${booking.movie_title} [${booking.booking_code}]`,
      html: htmlContent,
    });

    const newStatus = res.success ? 'SENT' : 'FAILED';
    db.prepare('UPDATE bookings SET email_status = ? WHERE id = ?').run(newStatus, bookingId);
  } catch (err) {
    console.error('[Resend Email Service] Error generating confirmation email:', err);
    try {
      db.prepare('UPDATE bookings SET email_status = ? WHERE id = ?').run('FAILED', bookingId);
    } catch {
      // Ignored
    }
  }
}
