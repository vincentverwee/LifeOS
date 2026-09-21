import { getAllTags } from "@/lib/data";
import { TagManagementList } from "@/components/tags/TagManagementList";
import { TagCreateForm } from "@/components/tags/TagCreateForm";

export default async function TagsPage() {
  const tags = await getAllTags();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tags</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Curated tags for slicing spend by &ldquo;why&rdquo;, independent of category. Managed
          here only — never freeform from the entry screen.
        </p>
      </div>

      <TagCreateForm />
      <TagManagementList initialTags={tags} />
    </div>
  );
}
