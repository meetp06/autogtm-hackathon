export type FiberIntentSignal = {
  text: string;
  source_url: string;
  company: string;
};

export type FiberProspect = {
  name: string;
  role: string;
  company: string;
  linkedin_url: string;
  work_email?: string;
  phone?: string;
  company_context: string;
  intent_signal: string;
  source: string;
  source_url: string;
};

export type FiberAudienceEstimate = {
  fiberAudienceId: string;
  query: string;
  estimatedCredits: number;
  listSize: number;
  availableCredits?: number;
  chargeInfo?: unknown;
  isSample: boolean;
};

export type FiberAudienceResult = {
  prospects: FiberProspect[];
  list_size: number;
  estimated_credits?: number;
  charge_info?: unknown;
  isSample: boolean;
};

export type FiberIntentResult = {
  signals: FiberIntentSignal[];
  isSample: boolean;
};
