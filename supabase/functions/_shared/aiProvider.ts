export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(instructions: string, messages: ProviderMessage[]): Promise<string>;
}

const extractText = (payload: any): string => {
  if (typeof payload?.output_text === "string" && payload.output_text.trim())
    return payload.output_text.trim();
  const parts: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string")
        parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
};

class OpenAIResponsesProvider implements AIProvider {
  readonly name = "OpenAI Responses API";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async generate(
    instructions: string,
    messages: ProviderMessage[],
  ): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions,
        input: messages,
        max_output_tokens: 1400,
        store: false,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage =
        payload?.error?.message ||
        `Provider request failed with status ${response.status}`;
      throw new Error(providerMessage);
    }

    const text = extractText(payload);
    if (!text) throw new Error("The AI provider returned an empty response.");
    return text;
  }
}

export const getAIProvider = (): AIProvider | null => {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) return null;
  return new OpenAIResponsesProvider(
    apiKey,
    Deno.env.get("NEXTAURA_AI_MODEL")?.trim() || "gpt-5.6-luna",
  );
};
