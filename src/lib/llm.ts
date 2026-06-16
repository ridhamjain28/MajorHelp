export interface ProjectProposal {
  title: string;
  description: string;
  milestones: string[];
}

export async function generateProjectProposals(apiKey: string, phase: string, domain: string, constraints: string): Promise<ProjectProposal[]> {
  const systemPrompt = `You are an expert technical project architect for engineering students.
Given the following inputs, generate exactly 3 comprehensive project proposals tailored to their academic phase and constraints.

Return the result strictly as a JSON object with a single key 'proposals' containing an array of objects.
Each object must have the following structure:
{
  "title": "String - Short, catchy project title",
  "description": "String - A detailed paragraph explaining what the project is, its value, and the core technologies used",
  "milestones": ["String - Milestone 1", "String - Milestone 2", "String - Milestone 3", "String - Milestone 4", "String - Milestone 5"]
}

Inputs:
- Academic Phase: ${phase}
- Domain Interest: ${domain}
- Constraints (Hardware/Software): ${constraints}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to generate proposals');
    }

    const data = await response.json();
    const resultContent = data.choices[0].message.content;
    const parsed = JSON.parse(resultContent);
    return parsed.proposals as ProjectProposal[];
  } catch (error) {
    console.error("LLM Generation Error:", error);
    throw error;
  }
}
