export function workerAuthorized(req: Request): boolean {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}
