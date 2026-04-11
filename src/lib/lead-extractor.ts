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
  // Strip ```lead_data ... ``` blocks
  let cleaned = content.replace(/```\s*lead_data\s*\n[\s\S]*?\n\s*```/g, "").trim();
  // Strip raw JSON lead data blocks (without backticks)
  cleaned = cleaned.replace(/\{\s*"businessType"[\s\S]*?"recommendedServices"[\s\S]*?\}/g, "").trim();
  // Strip partial/incomplete lead blocks
  cleaned = cleaned.replace(/```\s*lead_data[\s\S]*$/g, "").trim();
  cleaned = cleaned.replace(/\{\s*"businessType"[\s\S]*$/g, "").trim();
  return cleaned;
}

export function hasPartialLeadBlock(content: string): boolean {
  // Detect lead_data block starting (with backticks)
  if (/```\s*lead_data/.test(content) && !/```\s*lead_data\s*\n[\s\S]*?\n\s*```/.test(content)) {
    return true;
  }
  // Detect raw JSON lead data (without backticks) — AI sometimes omits them
  if (/\{\s*"businessType"/.test(content) && !/\}\s*$/.test(content.trim())) {
    return true;
  }
  return false;
}
