const fs = require('fs');

const workflowPath = 'd:\\Project Client\\Pak Arul Kuningan\\dashboard wa\\workflow\\new_ai_workflow.json';
const tempParserPath = 'd:\\Project Client\\Pak Arul Kuningan\\dashboard wa\\temp_parser.js';

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const tempParser = fs.readFileSync(tempParserPath, 'utf8');

workflow.nodes.forEach(node => {
  if (node.name === 'AI Agent (Otak Chatbot)') {
    // 1. Change intent to complaint
    let sysMsg = node.parameters.options.systemMessage;
    sysMsg = sysMsg.replace(
      /"intent": "none",\s*"confidence": 60/g,
      '"intent": "complaint",\n  "confidence": 60'
    );
    // Also change the description above it just in case
    sysMsg = sysMsg.replace(
      /Contoh 1 — Pelanggan ragu, minta testimoni, takut penipuan, atau nawar harga:/g,
      'Contoh 1 — Pelanggan ragu, minta testimoni, takut penipuan, nawar harga, atau marah/komplain:'
    );
    node.parameters.options.systemMessage = sysMsg;
  }

  if (node.name === 'Simpan Orderan') {
    // 2. Change type and status
    const params = node.parameters.bodyParameters.parameters;
    const typeParam = params.find(p => p.name === 'type');
    if (typeParam) typeParam.value = '={{ $(\'Baca Output AI (JS)\').item.json.paymentMethod || \'tf\' }}';
    
    const statusParam = params.find(p => p.name === 'status');
    if (statusParam) statusParam.value = 'closing';
  }

  if (node.name === 'Kirim Pesan Teks AI') {
    // 3. Add intent to send-message
    const params = node.parameters.bodyParameters.parameters;
    if (!params.find(p => p.name === 'intent')) {
      params.push({
        name: 'intent',
        value: '={{ $json.intent }}'
      });
    }
  }

  if (node.name === 'Baca Output AI (JS)') {
    // 4. Update JS code
    node.parameters.jsCode = tempParser;
  }
});

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log('Workflow updated successfully.');
