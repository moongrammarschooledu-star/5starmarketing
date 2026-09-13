"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { ConstructionTask, ConstructionTaskInput, TaskStatus, TaskPriority } from "@/lib/models/construction";
import { taskPriorities, taskStatuses } from "@/lib/models/construction";
import { createTaskAction, updateTaskStatusAction, updateTaskProgressAction, addTaskDependencyAction, removeTaskDependencyAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function TaskManager({
  projectId,
  tasks,
  phases,
  contractors,
  staff,
}: {
  projectId: string;
  tasks: ConstructionTask[];
  phases: { id: string; name: string }[];
  contractors: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionTaskInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionTaskInput>(key: K, value: ConstructionTaskInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.title?.trim()) {
      toast.show("Please enter a task title.");
      return;
    }
    startTransition(async () => {
      try {
        await createTaskAction(projectId, form as ConstructionTaskInput);
        toast.show("Task created.");
        setForm({});
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this task.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="font-heading text-base font-bold text-ink">Add Task</span>
          {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>
        {showForm && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Title</span>
                <input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} className={`${inputClass} w-full`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Phase</span>
                <select value={form.phaseId ?? ""} onChange={(e) => set("phaseId", e.target.value)} className={`${inputClass} w-full`}>
                  <option value="">None</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Priority</span>
                <select value={form.priority ?? "NORMAL"} onChange={(e) => set("priority", e.target.value as TaskPriority)} className={`${inputClass} w-full`}>
                  {taskPriorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Assigned Staff</span>
                <select value={form.assignedUserId ?? ""} onChange={(e) => set("assignedUserId", e.target.value)} className={`${inputClass} w-full`}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Contractor</span>
                <select value={form.contractorId ?? ""} onChange={(e) => set("contractorId", e.target.value)} className={`${inputClass} w-full`}>
                  <option value="">None</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Start Date</span>
                <input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={`${inputClass} w-full`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Due Date</span>
                <input type="date" value={form.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} className={`${inputClass} w-full`} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Depends On</span>
                <select multiple value={form.dependsOnTaskIds ?? []} onChange={(e) => set("dependsOnTaskIds", Array.from(e.target.selectedOptions).map((o) => o.value))} className={`${inputClass} h-24 w-full`}>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.taskNumber} — {t.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Add Task
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {tasks.map((t) => (
          <TaskRow key={t.id} projectId={projectId} task={t} allTasks={tasks} />
        ))}
        {tasks.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
      </div>
    </div>
  );
}

function TaskRow({ projectId, task, allTasks }: { projectId: string; task: ConstructionTask; allTasks: ConstructionTask[] }) {
  const [progress, setProgress] = useState(task.progress);
  const [addDepId, setAddDepId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const isBlocked = task.dependsOnTaskIds.some((depId) => {
    const dep = allTasks.find((t) => t.id === depId);
    return dep && dep.status !== "COMPLETED" && dep.status !== "CANCELLED";
  });

  function setStatus(status: TaskStatus) {
    startTransition(async () => {
      try {
        await updateTaskStatusAction(task.id, projectId, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this task.");
      }
    });
  }

  function saveProgress() {
    startTransition(async () => {
      await updateTaskProgressAction(task.id, projectId, progress);
      router.refresh();
    });
  }

  function addDependency() {
    if (!addDepId) return;
    startTransition(async () => {
      try {
        await addTaskDependencyAction(task.id, addDepId, projectId);
        setAddDepId("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this dependency.");
      }
    });
  }

  function removeDependency(depId: string) {
    startTransition(async () => {
      await removeTaskDependencyAction(task.id, depId, projectId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {task.taskNumber} — {task.title}{" "}
            {isBlocked && (
              <span title="Blocked by dependency">
                <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
              </span>
            )}
          </p>
          <p className="text-xs text-muted">
            {task.phaseName ? `${task.phaseName} · ` : ""}
            {task.assignedUserName ?? task.contractorName ?? "Unassigned"} {task.dueDate ? `· Due ${new Date(task.dueDate).toLocaleDateString("en-GB")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} onMouseUp={saveProgress} onTouchEnd={saveProgress} className="w-28" />
          <span className="text-xs font-bold text-ink">{progress}%</span>
        </div>
        <select value={task.status} onChange={(e) => setStatus(e.target.value as TaskStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
          {taskStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {task.dependsOnTaskIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.dependsOnTaskIds.map((depId) => {
            const dep = allTasks.find((t) => t.id === depId);
            return (
              <span key={depId} className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted">
                Depends on: {dep?.title ?? "Unknown"}
                <button type="button" onClick={() => removeDependency(depId)} className="text-muted hover:text-primary">
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <select value={addDepId} onChange={(e) => setAddDepId(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
          <option value="">Add dependency...</option>
          {allTasks
            .filter((t) => t.id !== task.id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
        <button type="button" onClick={addDependency} disabled={!addDepId || isPending} className="text-xs font-bold text-primary hover:underline disabled:opacity-50">
          Add
        </button>
      </div>
    </div>
  );
}
