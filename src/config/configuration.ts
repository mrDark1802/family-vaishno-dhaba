export default () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.API_PORT || "4000", 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev_secret",
    expiresIn: process.env.JWT_EXPIRATION || "7d",
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || "dev_cookie_secret",
  },
  totp: {
    encryptionKey:
      process.env.TOTP_ENCRYPTION_KEY ||
      "fvd_totp_encryption_key_32_bytes_dev_2026_change_in_production_key!",
  },
  cors: {
    origin: (
      process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001"
    )
      .split(",")
      .map((origin) => origin.trim()),
  },
  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL || "60", 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || "100", 10),
  },
  payments: {
    provider: process.env.PAYMENT_PROVIDER || "razorpay",
    webhookSecret:
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.PAYMENT_WEBHOOK_SECRET ||
      "rzp_test_webhook_secret_fvd_2026",
    keyId: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_KEY_ID || "",
    keySecret:
      process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_KEY_SECRET || "",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "https://family-vaishno-dhaba.vercel.app/api/auth/google/callback",
  },
});
