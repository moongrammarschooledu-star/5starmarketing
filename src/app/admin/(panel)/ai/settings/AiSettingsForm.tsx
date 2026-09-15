"use client";

import { useState, useTransition } from "react";
import { updateAiAssistantConfigAction } from "@/lib/actions/ai.actions";
import { assistantLabels, AI_TOOL_NAMES } from "@/lib/models/ai";
import type { AiAssistantConfig } from "@/lib/models/ai";

export function AiSettingsForm({ initialConfigs, readOnly }: { initialConfigs: AiAssistantConfig[]; readOnly: boolean }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function patch(assistantType: string, changes: Partial<AiAssistantConfig>) {
    setConfigs((prev) => prev.map((c) => (c.assistantType === assistantType ? { ...c, ...changes } : c)));
  }

  function save(cfg: AiAssistantConfig) {
    startTransition(async () => {
      await updateAiAssistantConfigAction(cfg.assistantType, {
        enabled: cfg.enabled,
        allowedTools: cfg.allowedTools,
        allowWriteActions: cfg.allowWriteActions,
        requireApprovalForWrite: cfg.requireApprovalForWrite,
        conversationRetentionDays: cfg.conversationRetentionDays,
      });
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  const global = configs.find((c) => c.assistantType === "GLOBAL");

  return (
    <div className="mt-6 space-y-6">
      {global && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5">
          <p className="font-heading text-base font-bold text-ink">Master Switch</p>
          <p className="mt-1 text-sm text-muted">Turning this off disables the AI assistant everywhere — admin and customer portal.</p>
          <label className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={global.enabled}
              onChange={(e) => patch("GLOBAL", { enabled: e.target.checked })}
            />
            AI features enabled platform-wide
          </label>
          {!readOnly && (
            <button
              onClick={() => save(configs.find((c) => c.assistantType === "GLOBAL")!)}
              disabled={pending}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>
      )}

      {configs
        .filter((c) => c.assistantType !== "GLOBAL")
        .map((cfg) => (
          <div key={cfg.assistantType} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="font-heading text-base font-bold text-ink">{assistantLabels[cfg.assistantType as keyof typeof assistantLabels] ?? cfg.assistantType}</p>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" disabled={readOnly} checked={cfg.enabled} onChange={(e) => patch(cfg.assistantType, { enabled: e.target.checked })} />
                Enabled
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={cfg.allowWriteActions}
                  onChange={(e) => patch(cfg.assistantType, { allowWriteActions: e.target.checked })}
                />
                Allow suggested/confirmed write actions
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={cfg.requireApprovalForWrite}
                  onChange={(e) => patch(cfg.assistantType, { requireApprovalForWrite: e.target.checked })}
                />
                Require human approval
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                Retention (days)
                <input
                  type="number"
                  min={1}
                  disabled={readOnly}
                  value={cfg.conversationRetentionDays}
                  onChange={(e) => patch(cfg.assistantType, { conversationRetentionDays: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-border px-2 py-1"
                />
              </label>
            </div>

            <div className="mt-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Allowed tools</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AI_TOOL_NAMES.map((tool) => {
                  const active = cfg.allowedTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        patch(cfg.assistantType, {
                          allowedTools: active ? cfg.allowedTools.filter((t) => t !== tool) : [...cfg.allowedTools, tool],
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
                      }`}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
            </div>

            {!readOnly && (
              <button onClick={() => save(cfg)} disabled={pending} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                Save
              </button>
            )}
          </div>
        ))}

      {savedAt && <p className="text-xs text-muted">Saved at {savedAt}.</p>}
    </div>
  );
}
