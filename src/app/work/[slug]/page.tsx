import { notFound } from "next/navigation";
import Link from "next/link";
import { projects, getProject } from "@/lib/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getProject(slug);
  return { title: p ? `${p.title} — Sargundeep Singh` : "Work" };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <Link
        href="/work"
        className="font-mono-label mb-8 inline-block text-xs text-[var(--ink-faint)] hover:text-[var(--accent)]"
      >
        ← ALL WORK
      </Link>

      <p className="font-mono-label mb-2 text-xs text-[var(--accent)]">
        {project.category}
      </p>
      <h1 className="font-serif-editorial mb-4 text-4xl text-[var(--ink)]">
        {project.title}
      </h1>
      <p className="mb-10 text-lg text-[var(--ink-dim)]">{project.oneLine}</p>

      <div className="mb-10 flex flex-wrap gap-2">
        {project.stack.map((s) => (
          <span
            key={s}
            className="font-mono-label rounded-full border border-[var(--line)] px-3 py-1 text-[10px] text-[var(--ink-faint)]"
          >
            {s}
          </span>
        ))}
      </div>

      <Section title="Problem">
        <p className="text-[var(--ink-dim)]">{project.problem}</p>
      </Section>

      <Section title="My role">
        <p className="text-[var(--ink-dim)]">{project.role}</p>
      </Section>

      <Section title="What I changed">
        <ul className="list-inside list-disc space-y-2 text-[var(--ink-dim)]">
          {project.contributions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>

      <Section title="Outcome">
        <ul className="list-inside list-disc space-y-2 text-[var(--ink-dim)]">
          {project.outcome.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </Section>

      <Section title="What I'd do differently">
        <p className="text-[var(--ink-dim)]">{project.lessons}</p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 border-t border-[var(--line)] pt-6">
      <h2 className="font-mono-label mb-3 text-xs text-[var(--ink-faint)]">
        {title.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}
