import Link from "next/link";
import { Home, FolderKanban } from "lucide-react";

export default function ProjectNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center bg-surface px-4 py-20 text-center">
      <h1 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">Project Not Found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        This project is no longer available, or the link is out of date.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/projects"
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <FolderKanban className="h-4 w-4" /> Browse Projects
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
        >
          <Home className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </main>
  );
}
