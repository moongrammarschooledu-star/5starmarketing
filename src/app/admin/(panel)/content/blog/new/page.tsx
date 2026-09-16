import { requireSection } from "@/lib/guard";
import { BlogPostForm } from "@/components/admin/BlogPostForm";

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  await requireSection("content");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">New Blog Post</h1>
      <div className="mt-6">
        <BlogPostForm />
      </div>
    </div>
  );
}
