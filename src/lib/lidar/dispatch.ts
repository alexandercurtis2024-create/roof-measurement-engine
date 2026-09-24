export async function dispatchLidarJob(jobId: string): Promise<{ ok: boolean; reason?: string }> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) return { ok: false, reason: "missing_dispatch_token" };
  const res = await fetch(
    "https://api.github.com/repos/alexandercurtis2024-create/roof-measurement-engine/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ event_type: "lidar-job", client_payload: { jobId } }),
    },
  );
  if (!res.ok) return { ok: false, reason: `github_${res.status}` };
  return { ok: true };
}
