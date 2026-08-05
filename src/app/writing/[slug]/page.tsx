import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { getAllPosts, getPostSource } from "@/lib/posts";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostSource(slug);
  return { title: post ? `${post.data.title} — Sargundeep Singh` : "Writing" };
}

const streamLabels: Record<string, string> = {
  engineering: "ENGINEERING",
  notes: "NOTES",
  human: "HUMAN",
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostSource(slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <Link
        href="/writing"
        className="font-mono-label mb-8 inline-block text-xs text-[var(--ink-faint)] hover:text-[var(--accent)]"
      >
        ← ALL WRITING
      </Link>

      <p className="font-mono-label mb-3 text-xs text-[var(--accent)]">
        {streamLabels[post.data.stream]} · {post.data.date}
      </p>
      <h1 className="font-serif-editorial mb-8 text-4xl text-[var(--ink)]">
        {post.data.title}
      </h1>

      <article className="prose-custom font-serif-editorial max-w-none text-[var(--ink-dim)]">
        <MDXRemote
          source={post.content}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [rehypeSlug],
            },
          }}
        />
      </article>

      {post.data.tags?.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-2 border-t border-[var(--line)] pt-6">
          {post.data.tags.map((t: string) => (
            <span
              key={t}
              className="font-mono-label rounded-full border border-[var(--line)] px-3 py-1 text-[10px] text-[var(--ink-faint)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
