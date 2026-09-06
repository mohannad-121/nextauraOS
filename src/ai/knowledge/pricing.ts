export const NEXTAURA_PRICING = {
  oneAppFree: {
    name: 'One App Free',
    monthly: '$0 / user / month',
    yearly: '$0 / user / month',
    summary: 'Choose one NextAura app with unlimited users at no subscription cost.',
  },
  standard: {
    name: 'Standard',
    monthly: '$7 / user / month',
    yearly: '$5.50 / user / month billed annually',
    summary: 'Use the complete standard NextAura business suite with predictable per-user pricing.',
  },
  custom: {
    name: 'Custom',
    monthly: '$10 / user / month',
    yearly: '$8 / user / month billed annually',
    summary: 'Add advanced customization, multi-company capabilities, integrations, and automation.',
  },
} as const;

export const formatPricingAnswer = (plan?: keyof typeof NEXTAURA_PRICING): string => {
  if (plan) {
    const selected = NEXTAURA_PRICING[plan];
    return `💳 **${selected.name}**\n\n${selected.summary}\n\n• Monthly: **${selected.monthly}**\n• Yearly: **${selected.yearly}**`;
  }

  return `💳 **NextAura pricing**\n\n• **One App Free** — $0 / user / month on monthly or yearly billing\n• **Standard** — $7 monthly, or $5.50 / user / month billed annually\n• **Custom** — $10 monthly, or $8 / user / month billed annually\n\n💡 Annual billing lowers the per-user monthly rate for Standard and Custom.`;
};
