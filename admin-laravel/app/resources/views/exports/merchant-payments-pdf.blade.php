<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Merchant Payments Export</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 10px; }
    h1 { margin: 0 0 2px; font-size: 16px; }
    .meta { margin: 0 0 14px; color: #475569; font-size: 9px; }
    .meta span { margin-right: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; color: #475569; font-size: 8px; text-transform: uppercase; text-align: left; padding: 5px 6px; border: 1px solid #e2e8f0; }
    td { padding: 5px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
    .num { text-align: right; }
    .zero { color: #94a3b8; }
    .no-payments td { color: #94a3b8; font-style: italic; }
  </style>
</head>
<body>
  <h1>Merchant Payments Export</h1>
  <p class="meta">
    <span><strong>Period:</strong> {{ $range['label'] }}</span>
    <span><strong>Date range:</strong> {{ $range['from'] }} to {{ $range['to'] }}</span>
    <span><strong>Generated:</strong> {{ $generatedAt }}</span>
    <span><strong>Merchants:</strong> {{ count($rows) }}</span>
  </p>
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
        <th class="num">Latest Amt</th>
        <th>Provider</th>
        <th>Status</th>
        <th>Latest At</th>
      </tr>
    </thead>
    <tbody>
      @forelse ($rows as $row)
        @php $noPayments = (int)$row['payments_count'] === 0; @endphp
        <tr class="{{ $noPayments ? 'no-payments' : '' }}">
          <td>{{ $row['merchant_name'] }}</td>
          <td>{{ $row['merchant_email'] }}</td>
          <td class="num {{ $noPayments ? 'zero' : '' }}">{{ number_format((float) $row['total_amount'], 2) }}</td>
          <td>{{ $row['currency'] }}</td>
          <td class="num {{ $noPayments ? 'zero' : '' }}">{{ $row['payments_count'] }}</td>
          <td class="num {{ $noPayments ? 'zero' : '' }}">{{ $row['finished_count'] }}</td>
          <td class="num {{ $noPayments ? 'zero' : '' }}">{{ $row['pending_count'] }}</td>
          <td class="num {{ $noPayments ? 'zero' : '' }}">{{ $row['failed_count'] }}</td>
          <td class="num {{ $noPayments ? 'zero' : '' }}">{{ $row['refunded_count'] }}</td>
          <td>{{ $noPayments ? 'No Payments' : ($row['latest_order_id'] ?? '—') }}</td>
          <td class="num">{{ $noPayments ? '—' : number_format((float) ($row['latest_amount'] ?? 0), 2) }}</td>
          <td>{{ $row['latest_provider'] ?? '—' }}</td>
          <td>{{ $noPayments ? 'No Payments' : ($row['latest_status'] ?? '—') }}</td>
          <td>{{ $noPayments ? '—' : ($row['latest_payment_at'] ?? '—') }}</td>
        </tr>
      @empty
        <tr>
          <td colspan="14" style="text-align:center; color:#94a3b8; padding:16px;">
            No merchant activity matched the selected filters.
          </td>
        </tr>
      @endforelse
    </tbody>
  </table>
</body>
</html>
