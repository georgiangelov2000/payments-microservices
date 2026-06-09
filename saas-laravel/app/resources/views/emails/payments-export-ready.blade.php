<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payments Export Ready</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px">

        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">

          {{-- Header --}}
          <tr>
            <td style="background:#4f46e5;padding:24px 36px">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">
                PayFlow
              </span>
            </td>
          </tr>

          {{-- Body --}}
          <tr>
            <td style="padding:36px 36px 28px">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">
                Your export is ready
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6">
                Your <strong>{{ $format }}</strong> payments export has been generated
                and is attached to this email.
              </p>

              {{-- Details card --}}
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:28px">
                <tr>
                  <td style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0">
                    <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em">
                      Export details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b;width:130px;vertical-align:top">Format</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">{{ $format }}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b;vertical-align:top">File</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a;font-family:monospace">{{ $filename }}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b;vertical-align:top">Generated at</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">{{ $exportedAt }}</td>
                      </tr>
                      @if (!empty($filters['from']) || !empty($filters['to']))
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b;vertical-align:top">Date range</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">
                          {{ $filters['from'] ?? '—' }} → {{ $filters['to'] ?? '—' }}
                        </td>
                      </tr>
                      @endif
                      @if (!empty($filters['status']))
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b;vertical-align:top">Status filter</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">
                          {{ ucfirst($filters['status']) }}
                        </td>
                      </tr>
                      @endif
                      @if (!empty($filters['order_id']))
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b;vertical-align:top">Order ID</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">
                          #{{ $filters['order_id'] }}
                        </td>
                      </tr>
                      @endif
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
                This file contains all payments matching your filter criteria at the time the export was
                requested. Export files are deleted from our servers after delivery.
              </p>

            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0">
              <p style="margin:0;font-size:12px;color:#94a3b8">
                Sent by PayFlow &middot; Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
