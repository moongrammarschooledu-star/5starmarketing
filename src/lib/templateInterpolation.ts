/** {{variable}} interpolation — unmatched keys are left as literal
 *  visible text (never silently blanked). Shared between server
 *  services (marketingTemplateService, documentPdfService) and client
 *  components (MessageComposer's live preview) — deliberately has no
 *  "server-only" import so either side can use it. */
export function interpolateTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}
