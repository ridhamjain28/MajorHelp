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

export async function expandTask(apiKey: string, taskTitle: string, taskDescription: string): Promise<string> {
  const systemPrompt = `You are an expert technical project architect for engineering students.
The student has a task: "\${taskTitle}"
Current details: "\${taskDescription}"

Generate a short, actionable checklist of 3-5 sub-tasks or implementation steps to accomplish this task.
Return the result as a raw markdown checklist, e.g.:
- [ ] Sub-task 1
- [ ] Sub-task 2
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer \${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to expand task');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("LLM Expand Task Error:", error);
    throw error;
  }
}
