export const GREETING_VARIANTS = [
  '👋 Hey! What can I help you with today?',
  '✨ Hi there — what would you like to do in NextAura?',
  '🚀 Ready when you are. Ask me anything about your workspace.',
  '💼 Hello! I can explain NextAura, guide a workflow, or summarize permitted workspace data.',
];

export const HELP_ANSWER = `🧠 **I’m your intelligent NextAura assistant.**\n\nYou can ask me to:\n\n• Explain any Finance, People, Marketing, or Platform app\n• Guide you through a workflow step by step\n• Open a page or action without performing destructive work\n• Summarize enabled services and permitted workspace counts\n• Compare NextAura pricing plans\n• Continue a topic with a follow-up such as “How do I create one?”`;

export const FALLBACK_VARIANTS = [
  `🤔 **I’m not completely sure what you mean yet.**\n\nYou can ask me about:\n\n• 💰 Finance and invoices\n• 👥 Employees and payroll\n• 📣 Marketing\n• 📂 Documents and contacts\n• 💳 Pricing\n\nTry: “How do I create an invoice?”`,
  `💡 **Let’s narrow that down.**\n\nI can explain a NextAura service, guide a workflow, open an app, or summarize permitted workspace data. Try asking “What apps do I have?” or “What can I do in Payroll?”`,
];

export const pickVariant = (variants: string[], seed: string): string => {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const randomValue = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : hash;
  return variants[(hash + randomValue) % variants.length];
};
