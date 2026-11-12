// The tables the admin "Data Backup" page can download. Each one is read with the
// signed-in Super Admin's own access, so nothing here bypasses row level security.

export interface BackupTable {
  id: string;
  label: string;
  /** What is in it, in plain words. */
  about: string;
  table: string;
  /** Holds people's phone numbers, emails or private owner details. */
  personal?: boolean;
}

export const BACKUP_GROUPS: { title: string; tables: BackupTable[] }[] = [
  {
    title: "Leads and customers",
    tables: [
      { id: "leads", label: "Leads", about: "Everyone who contacted you through the website, WhatsApp or ads", table: "leads", personal: true },
      { id: "lead-notes", label: "Lead notes", about: "Notes your team wrote on leads", table: "lead_notes" },
      { id: "follow-ups", label: "Follow-ups", about: "Calls and visits planned for leads", table: "follow_ups" },
      { id: "lead-deletion-log", label: "Deleted leads log", about: "A copy of every lead that was deleted, with who and when", table: "lead_deletion_log", personal: true },
      { id: "customers", label: "Customer accounts", about: "People who registered on the website", table: "customer_profiles", personal: true },
      { id: "demands", label: "Client demands", about: "What clients are looking to buy or rent", table: "property_demands", personal: true },
      { id: "appointments", label: "Appointments", about: "Site visits and meetings", table: "appointments", personal: true },
      { id: "deals", label: "Deals", about: "Sales and rentals in progress or closed", table: "deals", personal: true },
    ],
  },
  {
    title: "Properties and projects",
    tables: [
      { id: "properties", label: "Properties", about: "All property listings", table: "properties" },
      { id: "owner-details", label: "Property owner details", about: "Private owner names and phone numbers", table: "owner_private_details", personal: true },
      { id: "projects", label: "Projects", about: "Your projects", table: "projects" },
      { id: "brochures", label: "Brochures", about: "Brochures you made", table: "brochures" },
    ],
  },
  {
    title: "Marketing",
    tables: [
      { id: "campaigns", label: "Campaigns", about: "Your ad campaigns", table: "campaigns" },
      { id: "campaign-events", label: "Campaign visits", about: "Visits and clicks counted for each campaign", table: "campaign_events" },
      { id: "landing-pages", label: "Landing pages", about: "Pages made for ads", table: "public_landing_pages" },
      { id: "marketing-templates", label: "Message templates", about: "Email and WhatsApp templates", table: "marketing_templates" },
      { id: "marketing-tags", label: "Tags", about: "Tags for sorting leads", table: "marketing_tags" },
      { id: "marketing-workflows", label: "Workflows", about: "Automatic actions", table: "marketing_workflows" },
      { id: "marketing-workflow-actions", label: "Workflow steps", about: "The steps inside each workflow", table: "marketing_workflow_actions" },
    ],
  },
  {
    title: "Website and team",
    tables: [
      { id: "website-settings", label: "Website settings", about: "Company details and settings", table: "website_settings" },
      { id: "services", label: "Services", about: "Services shown on the website", table: "services" },
      { id: "blog-posts", label: "Blog posts", about: "Articles on the website", table: "blog_posts" },
      { id: "news", label: "News bar", about: "Messages in the scrolling news bar", table: "site_news" },
      { id: "staff", label: "Staff accounts", about: "Admins, agents and editors (names, roles, emails)", table: "admin_profiles", personal: true },
    ],
  },
];

export const BACKUP_TABLES: BackupTable[] = BACKUP_GROUPS.flatMap((g) => g.tables);
