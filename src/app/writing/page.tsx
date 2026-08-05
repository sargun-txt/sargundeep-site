import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = { title: "Writing — Sargundeep Singh" };

const streamLabels: Record<string, string> = {
  engineering: "ENGINEERING",
  notes: "NOTES",
  human: "HUMAN",
};

export default function WritingIndex() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="font-mono-label mb-3 text-xs text-[var(--accent)]">
        WRITING
      </p>
      <h1 className="font-serif-editorial mb-4 text-4xl text-[var(--ink)]">
        Sit down. Read.
      </h1>
      <p className="mb-12 max-w-xl text-[var(--ink-dim)]">
        Production incidents, shorter observations, and things that are
        sometimes technical and sometimes not.
      </p>

      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/writing/${post.slug}`}
            className="group flex flex-col gap-1 py-6"
          >
            <span className="font-mono-label text-[11px] text-[var(--ink-faint)]">
              {streamLabels[post.stream]} · {post.date} · {post.readingTime}
            </span>
            <span className="font-serif-editorial text-xl text-[var(--ink)] group-hover:text-[var(--accent)]">
              {post.title}
            </span>
            <span className="text-sm text-[var(--ink-dim)]">
              {post.excerpt}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
