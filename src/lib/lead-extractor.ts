export interface LeadData {
  businessType?: string;
  businessName?: string;
  currentProblems?: string[];
  desiredSolutions?: string[];
  currentTools?: string[];
  employeeCount?: string;
  budgetRange?: string;
  timeline?: string;
  contactName?: string;
  contactPhone?: string;
  contactTelegram?: string;
  summary?: string;
  qualificationScore?: number;
  recommendedServices?: string[];
}

export function extractLeadData(content: string): LeadData | null {
  const match = content.match(/```\s*lead_data\s*\n([\s\S]*?)\n\s*```/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]) as LeadData;
    return data;
  } catch (e) {
    console.error("Failed to parse lead_data:", e, "Raw:", match[1]?.slice(0, 200));
    return null;
  }
}

export function stripLeadBlock(content: string): string {
  return content.replace(/```\s*lead_data\s*\n[\s\S]*?\n\s*```/g, "").trim();
}

export function hasPartialLeadBlock(content: string): boolean {
  return /```\s*lead_data/.test(content) && !/```\s*lead_data\s*\n[\s\S]*?\n\s*```/.test(content);
}
