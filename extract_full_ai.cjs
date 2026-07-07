const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('workflow/chatbot.json', 'utf8'));
  const promptNode = data.nodes.find(n => n.name === 'pharsing hasil supabase');
  console.log("=== PROMPT PARSING SCRIPT ===");
  if (promptNode) console.log(promptNode.parameters.jsCode);

  console.log("\n=== AI AGENT NODE ===");
  const aiNode = data.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  if (aiNode) console.log(JSON.stringify(aiNode.parameters, null, 2));

  console.log("\n=== TOOLS ===");
  const toolNodes = data.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequestTool');
  toolNodes.forEach(t => {
    console.log(`Tool: ${t.name}`);
    console.log(JSON.stringify(t.parameters, null, 2));
  });

} catch (e) {
  console.error(e);
}
