export const metadata = { title: "About — Sargundeep Singh" };

const fragments = [
  {
    label: "Engineer",
    text: "I like systems that leave the demo stage and survive real users.",
  },
  {
    label: "Teacher",
    text: "I enjoy explaining the point where someone's confusion finally breaks.",
  },
  {
    label: "Musician",
    text: "I sing, play guitar, and make unfinished things sound increasingly finished.",
  },
  {
    label: "Writer",
    text: "Sometimes technical. Sometimes political. Sometimes neither.",
  },
  {
    label: "Currently",
    text: "Studying Computer Science with a Business minor at the University of Alberta.",
  },
];

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="font-mono-label mb-3 text-xs text-[var(--accent)]">
        ABOUT
      </p>
      <h1 className="font-serif-editorial mb-12 text-4xl text-[var(--ink)]">
        Not a passionate AI engineer committed to innovation.
      </h1>

      <div className="space-y-10">
        {fragments.map((f) => (
          <div
            key={f.label}
            className="border-l-2 border-[var(--line)] pl-6"
          >
            <p className="font-mono-label mb-2 text-xs text-[var(--ink-faint)]">
              {f.label.toUpperCase()}
            </p>
            <p className="font-serif-editorial text-xl text-[var(--ink-dim)]">
              {f.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-4 border-t border-[var(--line)] pt-8">
        <a
          href="/resume.pdf"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[#0b0a08]"
        >
          Resume
        </a>
        <a
          href="mailto:deep2004sargun@gmail.com"
          className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)]"
        >
          Email
        </a>
        <a
          href="https://github.com/sargun-txt"
          className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)]"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
