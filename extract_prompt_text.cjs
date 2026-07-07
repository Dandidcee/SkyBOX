const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('workflow/chatbot.json', 'utf8'));
  const promptNode = data.nodes.find(n => n.name === 'pharsing hasil supabase');
  if (promptNode) {
    fs.writeFileSync('prompt.txt', promptNode.parameters.jsCode);
  }
} catch (e) {
  console.error(e);
}
