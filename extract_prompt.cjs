const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('workflow/chatbot.json', 'utf8'));
  const aiNodes = data.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  
  if (aiNodes.length > 0) {
    console.log("Found AI Node Prompt:");
    console.log(aiNodes[0].parameters.text || aiNodes[0].parameters.options?.systemMessage || aiNodes[0].parameters.prompt);
  } else {
    console.log("No AI node found.");
  }
} catch (e) {
  console.error(e);
}
