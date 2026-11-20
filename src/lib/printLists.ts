// What the "Print short list" menu offers on the Properties and Demands pages.
// Plain data (no React), so server pages can hand it to the menu.

export type PrintOption = readonly [value: string, label: string];

export interface PrintListConfig {
  /** Where the PDF comes from, e.g. "/admin/properties/list-pdf". */
  basePath: string;
  /** Which records: the first value is the default ("all"). */
  purposes: readonly PrintOption[];
  /** Status choices: the first value is the default. */
  statuses: readonly PrintOption[];
  /** One line under the button saying what the list holds. */
  note: string;
}

export const PROPERTY_PRINT_CONFIG: PrintListConfig = {
  basePath: "/admin/properties/list-pdf",
  purposes: [
    ["all", "Sale and rent"],
    ["sale", "For sale only"],
    ["rent", "For rent only"],
  ],
  statuses: [
    ["available", "Available only"],
    ["all", "All (including sold, reserved, inactive)"],
  ],
  note: "Name, area, demand, size and the owner's contact number. For office use - it has private numbers.",
};

export const DEMAND_PRINT_CONFIG: PrintListConfig = {
  basePath: "/admin/demands/list-pdf",
  purposes: [
    ["all", "Buy, rent and girvi"],
    ["buy", "Want to buy only"],
    ["rent", "Want to rent only"],
    ["girvi", "Want on girvi only"],
  ],
  statuses: [
    ["waiting", "Still waiting (open or matched)"],
    ["all", "All (including closed and lost)"],
  ],
  note: "Client, number, what they want, area, budget, size and family members. For office use - it has private numbers.",
};
