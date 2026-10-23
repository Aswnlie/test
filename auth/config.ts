export const authConfig = {
  formSize: 16_384,
  maxAttempts: 10,
  // milliseconds for the request limit
  attemptWindow: 60_000,
  maxTrackedIps: 1000,
  // cookie lifetimes use seconds
  csrfLifetime: 3600,
  sessionLifetime: 7 * 24 * 60 * 60,
};
