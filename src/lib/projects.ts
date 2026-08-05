export type Project = {
  slug: string;
  category: string;
  title: string;
  oneLine: string;
  problem: string;
  role: string;
  contributions: string[];
  outcome: string[];
  lessons: string;
  stack: string[];
};

export const projects: Project[] = [
  {
    slug: "charlie",
    category: "Systems that speak",
    title: "Charlie — Voice AI Credentialing",
    oneLine:
      "A voice agent that calls insurance payers to verify provider credentialing, and survives the reality of production phone lines.",
    problem:
      "Healthcare credentialing calls were failing under real production constraints: inconsistent IVR menus, hold music, payer-specific call flows, and calls that sounded successful but never actually persisted a usable result.",
    role: "Voice-agent orchestration, backend systems, scheduling logic, webhook handling, production diagnostics and reliability.",
    contributions: [
      "Reworked payer-specific routing so the agent adapts its call flow per payer instead of assuming one shape",
      "Added scheduling and concurrency safeguards to stop overlapping calls from stepping on each other",
      "Improved end-of-call diagnostics so failures are classified, not just logged",
      "Built escalation paths for calls that complete without a usable outcome",
      "Added persistence-result visibility so a 'successful' call that didn't save anything is treated as a failure",
    ],
    outcome: [
      "Dramatically reduced failed calls after the scheduling fix",
      "Improved traceability from call initiation through to persisted result",
      "Made incomplete 'successful' calls visible as technical failures instead of silent gaps",
    ],
    lessons:
      "A call that ends cleanly isn't the same as a call that worked. The most valuable diagnostic wasn't a better transcript — it was a hard boundary between 'the call finished' and 'the outcome persisted.'",
    stack: ["Voice AI", "Webhooks", "Async orchestration", "Scheduling"],
  },
  {
    slug: "studastic",
    category: "Systems that plan",
    title: "Studastic",
    oneLine:
      "A scheduling and study-planning system that turns a pile of deadlines into a workable plan.",
    problem:
      "Students default to ad-hoc scheduling that collapses the moment two deadlines overlap. Most planning tools track tasks, not time — they don't reason about what's actually feasible.",
    role: "Full-stack design and implementation — data model, scheduling logic, and interface.",
    contributions: [
      "Modeled study sessions as constrained blocks against available time, not a flat to-do list",
      "Built a scheduling algorithm that rebalances the plan when a deadline or availability changes",
      "Designed the interface around 'what should I do next' rather than 'here is everything'",
    ],
    outcome: [
      "A working planner that reflows automatically instead of requiring manual rescheduling",
      "Validated the core scheduling model against real coursework, not synthetic data",
    ],
    lessons:
      "The hard part was never the UI — it was deciding what the system should do when reality no longer matches the plan.",
    stack: ["Scheduling algorithms", "Full-stack", "Data modeling"],
  },
  {
    slug: "eeg-assistive",
    category: "Systems that interpret signals",
    title: "EEG-Based Assistive System",
    oneLine:
      "Turning raw EEG signal into physical commands for assistive control.",
    problem:
      "Assistive interfaces that depend on fine motor control exclude the people who need them most. Brain signal is noisy, individual, and unforgiving of naive thresholding.",
    role: "Signal processing, feature extraction, and command mapping.",
    contributions: [
      "Built a pipeline from raw EEG signal to filtered, denoised features",
      "Mapped extracted features to discrete physical commands with tolerance for signal drift",
      "Tuned thresholds against real sessions instead of fixed defaults",
    ],
    outcome: [
      "A working signal-to-command pipeline validated on live EEG input",
      "Groundwork for a system usable outside a controlled lab setting",
    ],
    lessons:
      "Most of the engineering effort wasn't the classifier — it was deciding what to throw away before the classifier ever saw the signal.",
    stack: ["Signal processing", "EEG", "Feature extraction", "Assistive tech"],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
