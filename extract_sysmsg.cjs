const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('workflow/chatbot.json', 'utf8'));
  const promptNode = data.nodes.find(n => n.name === 'AI Agent' || n.type.includes('agent'));
  if (promptNode && promptNode.parameters.options && promptNode.parameters.options.systemMessage) {
    fs.writeFileSync('system_message.txt', promptNode.parameters.options.systemMessage, 'utf8');
  } else {
    fs.writeFileSync('system_message.txt', 'NOT FOUND', 'utf8');
  }
} catch (e) {
  console.error(e);
}
