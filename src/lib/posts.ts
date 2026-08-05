import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const CONTENT_DIR = path.join(process.cwd(), "content", "writing");

export type PostMeta = {
  slug: string;
  title: string;
  stream: "engineering" | "notes" | "human";
  date: string;
  tags: string[];
  excerpt: string;
  readingTime: string;
};

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        title: data.title,
        stream: data.stream,
        date:
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : data.date,
        tags: data.tags ?? [],
        excerpt: data.excerpt ?? "",
        readingTime: readingTime(content).text,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostSource(slug: string) {
  const file = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  const normalized = {
    ...data,
    date:
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : data.date,
  };
  return {
    data: normalized as Omit<PostMeta, "slug" | "readingTime">,
    content,
  };
}
