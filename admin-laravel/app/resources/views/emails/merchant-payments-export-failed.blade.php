<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Merchant Payments Export Failed</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #fecaca;overflow:hidden">
          <tr>
            <td style="background:#dc2626;padding:24px 36px">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">PayFlow Admin</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">Merchant payments export failed</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#64748b;line-height:1.6">
                Your <strong>{{ strtoupper($export->format) }}</strong> export could not be generated.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #fee2e2;border-radius:8px;background:#fef2f2;margin-bottom:20px">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;color:#991b1b;line-height:1.6">
                    {{ $export->message ?: 'The export job failed before returning a detailed error.' }}
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
                Failed at {{ $failedAt ?? 'unknown time' }}. You can retry the export from the Merchant Payments page.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
