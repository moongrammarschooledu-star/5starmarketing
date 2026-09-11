export interface MarketingTag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export type MarketingTagInput = Pick<MarketingTag, "name" | "color">;

/** A saved filter definition (sections 29-30) — resolved against live
 *  `leads` data every time it's viewed, never a stored membership list. */
export interface MarketingSegment {
  id: string;
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketingSegmentInput = Pick<MarketingSegment, "name" | "description" | "conditions">;

export type SegmentConditionField =
  | "score"
  | "scoreLevel"
  | "status"
  | "source"
  | "campaignId"
  | "propertyId"
  | "projectId"
  | "budgetMin"
  | "budgetMax"
  | "preferredLocation"
  | "lastContactedDaysAgo"
  | "createdDaysAgo";

export interface SegmentCondition {
  field: SegmentConditionField;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
  value: string | number | string[];
}

export const segmentConditionFields: SegmentConditionField[] = [
  "score",
  "scoreLevel",
  "status",
  "source",
  "campaignId",
  "propertyId",
  "projectId",
  "budgetMin",
  "budgetMax",
  "preferredLocation",
  "lastContactedDaysAgo",
  "createdDaysAgo",
];
