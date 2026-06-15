<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Merchant Payments Export Ready</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
          <tr>
            <td style="background:#4f46e5;padding:24px 36px">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">PayFlow Admin</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 28px">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">Your merchant payments export is ready</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">
                Your <strong>{{ strtoupper($export->format) }}</strong> export has been generated and is attached to this email.
              </p>
              <p style="margin:0 0 24px">
                <a href="{{ $downloadUrl }}" style="display:inline-block;border-radius:8px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 18px">
                  Download from admin panel
                </a>
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
                <tr>
                  <td style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0">
                    <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em">Export details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b;width:130px">Format</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">{{ strtoupper($export->format) }}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b">File</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a;font-family:monospace">{{ $export->filename }}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b">Generated at</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">{{ $exportedAt }}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
                The download link requires an authenticated admin session.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
