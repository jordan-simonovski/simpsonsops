import type { Tweet } from "./tweets";

// Build-time topic tagging. Each rule is a label plus the terms that map to
// it; terms are matched on word boundaries so "ai" does not match "email".
// Keep this list curated: a tag only earns a chip if enough posts hit it
// (see MIN_TAG_COUNT), so adding speculative terms is harmless.
interface TagRule {
  label: string;
  terms: string[];
}

const TAG_RULES: TagRule[] = [
  { label: "AI", terms: ["ai", "llm", "chatgpt", "gpt", "copilot", "agent", "prompt"] },
  { label: "DevOps", terms: ["devops", "ci/cd", "cicd", "pipeline", "jenkins"] },
  { label: "SRE", terms: ["sre", "reliability", "slo", "sla", "toil"] },
  { label: "Kubernetes", terms: ["kubernetes", "k8s", "helm", "pod", "pods"] },
  { label: "Cloud", terms: ["cloud", "aws", "azure", "gcp", "lambda", "s3"] },
  { label: "Deploys", terms: ["deploy", "deployed", "deployment", "prod", "production", "rollback", "ship"] },
  { label: "On-call", terms: ["on-call", "oncall", "on call", "pager", "pagerduty", "incident", "outage", "downtime"] },
  { label: "Containers", terms: ["docker", "container", "containers", "image", "registry"] },
  { label: "Config", terms: ["yaml", "json", "config", "configuration", "manifest"] },
  { label: "Git", terms: ["git", "github", "gitlab", "merge", "rebase", "commit"] },
  { label: "Security", terms: ["security", "vuln", "vulnerability", "cve", "breach", "auth"] },
  { label: "Monitoring", terms: ["monitoring", "metrics", "prometheus", "grafana", "observability", "logs"] },
  { label: "Process", terms: ["agile", "scrum", "sprint", "standup", "jira", "meeting", "manager"] },
];

// Precompile one regex per rule. Word boundaries on both sides; terms with
// non-word chars (e.g. "ci/cd", "on-call") are escaped and bounded loosely.
const COMPILED: { label: string; re: RegExp }[] = TAG_RULES.map((rule) => {
  const alternation = rule.terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return { label: rule.label, re: new RegExp(`(?<![\\w])(?:${alternation})(?![\\w])`, "i") };
});

export function tagsFor(tweet: Pick<Tweet, "text" | "reply_to">): string[] {
  const haystack = `${tweet.text ?? ""} ${tweet.reply_to?.text ?? ""}`;
  if (!haystack.trim()) return [];
  const out: string[] = [];
  for (const { label, re } of COMPILED) {
    if (re.test(haystack)) out.push(label);
  }
  return out;
}

const MIN_TAG_COUNT = 6;

export interface TagCount {
  label: string;
  count: number;
}

// Tags that clear the threshold, ordered by frequency. Drives the chip row;
// chips for tags nobody posts about would just be dead UI.
export function tagCounts(tweets: Tweet[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const tweet of tweets) {
    for (const tag of tagsFor(tweet)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_TAG_COUNT)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
