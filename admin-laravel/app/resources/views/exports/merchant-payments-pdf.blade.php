<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Merchant Payments Export</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 10px; }
    h1 { margin: 0 0 4px; font-size: 18px; }
    p { margin: 0 0 14px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; color: #475569; font-size: 8px; text-transform: uppercase; text-align: left; padding: 6px; border: 1px solid #e2e8f0; }
    td { padding: 6px; border: 1px solid #e2e8f0; vertical-align: top; }
    .num { text-align: right; }
  </style>
</head>
<body>
  <h1>Merchant Payments Export</h1>
  <p>Generated at {{ $generatedAt }}</p>
  <table>
    <thead>
      <tr>
        <th>Merchant</th>
        <th>Email</th>
        <th class="num">Total</th>
        <th>Currency</th>
        <th class="num">Payments</th>
        <th class="num">Finished</th>
        <th class="num">Pending</th>
        <th class="num">Failed</th>
        <th class="num">Refunded</th>
        <th>Latest Order</th>
        <th class="num">Latest Amount</th>
        <th>Provider</th>
        <th>Status</th>
        <th>Latest At</th>
      </tr>
    </thead>
    <tbody>
      @forelse ($rows as $row)
        <tr>
          <td>{{ $row['merchant_name'] }}</td>
          <td>{{ $row['merchant_email'] }}</td>
          <td class="num">{{ number_format((float) $row['total_amount'], 2) }}</td>
          <td>{{ $row['currency'] }}</td>
          <td class="num">{{ $row['payments_count'] }}</td>
          <td class="num">{{ $row['finished_count'] }}</td>
          <td class="num">{{ $row['pending_count'] }}</td>
          <td class="num">{{ $row['failed_count'] }}</td>
          <td class="num">{{ $row['refunded_count'] }}</td>
          <td>{{ $row['latest_order_id'] ?? '—' }}</td>
          <td class="num">{{ $row['latest_amount'] === null ? '—' : number_format((float) $row['latest_amount'], 2) }}</td>
          <td>{{ $row['latest_provider'] ?? '—' }}</td>
          <td>{{ $row['latest_status'] ?? '—' }}</td>
          <td>{{ $row['latest_payment_at'] ?? '—' }}</td>
        </tr>
      @empty
        <tr>
          <td colspan="14">No merchant payment activity matched the selected filters.</td>
        </tr>
      @endforelse
    </tbody>
  </table>
</body>
</html>
