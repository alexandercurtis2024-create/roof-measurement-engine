export async function dispatchLidarJob(jobId: string) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_DISPATCH_REPO || "alexandercurtis2024-create/roof-measurement-engine";
  if (!token) return { ok: false, reason: "GITHUB_DISPATCH_TOKEN unset" };
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "roof-measurement-engine",
    },
    body: JSON.stringify({ event_type: "lidar-job", client_payload: { jobId } }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `GitHub dispatch ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}
