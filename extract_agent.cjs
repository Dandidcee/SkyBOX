const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('workflow/chatbot.json', 'utf8'));
  const promptNode = data.nodes.find(n => n.name === 'AI Agent' || n.type.includes('agent'));
  if (promptNode) {
    console.log("Agent Options:", JSON.stringify(promptNode.parameters.options, null, 2));
  }
} catch (e) {
  console.error(e);
}
