/**
 * Email HTML template for fortnightly reports.
 * Body content is AI-generated HTML; sign-off is fixed.
 * Wide card, edge-to-edge feel; tables have clear borders.
 */
const SIGN_OFF = `Thank You,<br/>Access Oxbridge`
const FOOTER = `For any queries please contact us via the portal`

export function buildFortnightlyReportEmailHtml(bodyHtml: string, subjectLine?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectLine ? subjectLine : 'Your Fortnightly Progress Report'}</title>
  <style type="text/css">
    .report-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    .report-body table td, .report-body table th { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
    .report-body table th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
    .report-body table td { color: #374151; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 16px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 800px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;">
          <tr>
            <td style="padding: 24px 28px 20px 28px; border-bottom: 1px solid #eee; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1a1a1a;">Fortnightly Progress Report</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Access Oxbridge Mentoring</p>
            </td>
          </tr>
          <tr>
            <td class="report-body" style="padding: 24px 28px; font-size: 15px; line-height: 1.65; color: #374151;">
              ${bodyHtml}
              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; font-size: 15px; color: #1a1a1a;">${SIGN_OFF}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px; background-color: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center;">
              ${FOOTER}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}
