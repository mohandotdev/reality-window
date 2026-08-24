export type WatchTemplate = {
  id: string;
  category: string;
  question: string;
  subject: string;
  assumption: string;
  sourceUrl?: string;
};

export const watchTemplates: WatchTemplate[] = [
  {
    id: "regulatory",
    category: "Regulatory",
    question: "Is this regulation still in effect?",
    subject: "Houston short-term rental regulations",
    assumption:
      "Short-term rentals remain legal for registered hosts in Houston, with a $275 annual registration fee.",
    sourceUrl: "https://www.houstontx.gov/",
  },
  {
    id: "product",
    category: "Product",
    question: "Does this API still support this feature?",
    subject: "Stripe API support for legacy Charges endpoint",
    assumption: "The Charges API is still available and supported for existing integrations.",
  },
  {
    id: "company",
    category: "Company",
    question: "Is this company still hiring for this role?",
    subject: "Design roles at a company I'm tracking",
    assumption: "They have an open product design position listed on their careers page.",
  },
  {
    id: "policy",
    category: "Policy",
    question: "Has this policy changed?",
    subject: "Remote work policy at my employer",
    assumption: "Employees may work remotely up to three days a week without approval.",
  },
];
