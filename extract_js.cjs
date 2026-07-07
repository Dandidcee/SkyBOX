const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('workflow/chatbot.json', 'utf8'));
  const jsNodes = data.nodes.filter(n => n.type === 'n8n-nodes-base.code');
  
  jsNodes.forEach(n => {
    console.log(`\n--- JS NODE: ${n.name} ---`);
    console.log(n.parameters.jsCode ? n.parameters.jsCode.substring(0, 500) + '...' : 'No jsCode');
  });
} catch (e) {
  console.error(e);
}
