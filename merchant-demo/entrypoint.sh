#!/bin/sh
set -e

# Write runtime config so the React app can read window.__CONFIG__.apiKey
# without baking the secret into the image at build time.
cat > /usr/share/nginx/html/config.js << EOF
window.__CONFIG__ = {
  apiKey: "${MERCHANT_API_KEY}"
};
EOF

exec nginx -g 'daemon off;'
