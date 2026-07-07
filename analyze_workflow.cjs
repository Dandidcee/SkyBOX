const fs = require('fs');

try {
  const data = fs.readFileSync('workflow/chatbot.json', 'utf8');
  const workflow = JSON.parse(data);
  console.log(`Workflow Name: ${workflow.name || 'Unnamed'}`);
  console.log(`Total Nodes: ${workflow.nodes ? workflow.nodes.length : 0}`);
  
  if (workflow.nodes) {
    workflow.nodes.forEach(node => {
      console.log(`- ${node.name} (${node.type})`);
      if (node.type.includes('prompt')) {
         console.log(`  Prompt: ${JSON.stringify(node.parameters).substring(0, 100)}...`);
      }
    });
  }
} catch (e) {
  console.error("Error:", e.message);
}
