import { notFound } from "next/navigation";
import { requireSection } from "@/lib/guard";
import { blogService } from "@/services/blogService";
import { BlogPostForm } from "@/components/admin/BlogPostForm";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("content");
  const { id } = await params;
  const post = await blogService.getById(id);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Blog Post</h1>
      <div className="mt-6">
        <BlogPostForm post={post} />
      </div>
    </div>
  );
}
