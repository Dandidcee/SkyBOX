const fs = require('fs');

let promptCode = fs.readFileSync('prompt.txt', 'utf8');
promptCode = promptCode.replace('const ctx = $input.first().json;', '');

const sysMessage = fs.readFileSync('system_message.txt', 'utf8');

const workflow = {
  "name": "Dashboard WA AI Core (v2)",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "meta-webhook",
        "options": {}
      },
      "name": "Webhook Masuk",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [0, 0],
      "webhookId": "dashboard-ai-webhook"
    },
    {
      "parameters": {
        "url": "=https://localhost/api/n8n/context/account/{{ $json.body.account_id }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "x-n8n-api-key", "value": "GANTI_DENGAN_API_KEY_ANDA" }
          ]
        },
        "options": {}
      },
      "name": "Tarik Data Konteks AI",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [200, 0]
    },
    {
      "parameters": {
        "url": "=https://localhost/api/n8n/chat-history/{{ $('Webhook Masuk').item.json.body.conversation_id }}?limit=15",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "x-n8n-api-key", "value": "GANTI_DENGAN_API_KEY_ANDA" }
          ]
        },
        "options": {}
      },
      "name": "Tarik Riwayat Chat",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [400, 0]
    },
    {
      "parameters": {
        "jsCode": "const ctx = $('Tarik Data Konteks AI').item.json;\nconst riwayatRaw = $input.first().json || [];\nctx.riwayat = riwayatRaw;\n" + promptCode
      },
      "name": "Format Prompt AI (JS)",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [600, 0]
    },
    {
      "parameters": {
        "text": "={{ $('Webhook Masuk').item.json.body.meta_payload.entry[0].changes[0].value.messages[0].text.body || 'Ada pesan masuk' }}",
        "options": {
          "systemMessage": sysMessage
        }
      },
      "name": "AI Agent (Otak Chatbot)",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.2,
      "position": [800, 0]
    },
    {
      "parameters": {
        "model": "gpt-4o-mini",
        "options": {}
      },
      "name": "OpenAI Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1,
      "position": [800, 200]
    },
    {
      "parameters": {
        "toolDescription": "Gunakan tool ini untuk mendapatkan daftar semua provinsi di Indonesia beserta ID-nya.",
        "url": "https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json"
      },
      "name": "Tool: Cek Provinsi",
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.1,
      "position": [950, 200]
    },
    {
      "parameters": {
        "toolDescription": "Gunakan tool ini untuk mencari daftar kabupaten atau kota. Membutuhkan ID Provinsi. Gunakan tool get_provinsi terlebih dahulu jika kamu belum tahu ID Provinsinya.",
        "url": "=https://www.emsifa.com/api-wilayah-indonesia/api/regencies/{{$fromAI(\"id_provinsi\")}}.json"
      },
      "name": "Tool: Cek Kabupaten/Kota",
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.1,
      "position": [1100, 200]
    },
    {
      "parameters": {
        "toolDescription": "Gunakan tool ini untuk mencari daftar kecamatan. Membutuhkan ID Kabupaten/Kota. Gunakan tool get_kabupaten_kota terlebih dahulu jika kamu belum tahu ID Kabupaten/Kota-nya.",
        "url": "=https://www.emsifa.com/api-wilayah-indonesia/api/districts/{{$fromAI(\"id_kabupaten\")}}.json"
      },
      "name": "Tool: Cek Kecamatan",
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.1,
      "position": [1250, 200]
    },
    {
      "parameters": {
        "toolDescription": "Gunakan tool ini untuk mencari daftar desa atau kelurahan. Membutuhkan ID Kecamatan. Gunakan tool get_kecamatan terlebih dahulu jika kamu belum tahu ID Kecamatan-nya.",
        "url": "=https://www.emsifa.com/api-wilayah-indonesia/api/villages/{{$fromAI(\"id_kecamatan\")}}.json"
      },
      "name": "Tool: Cek Desa/Kelurahan",
      "type": "n8n-nodes-base.httpRequestTool",
      "typeVersion": 4.1,
      "position": [1400, 200]
    },
    {
      "parameters": {
        "jsCode": "const raw = $input.first().json.output;\nlet parsed = {};\ntry {\n  const clean = raw.replace(/```json\\s*/gi, '').replace(/```/g, '').trim();\n  parsed = JSON.parse(clean);\n} catch (e) {\n  parsed = { reply: 'Mohon maaf, sistem sedang sibuk.', confidence: 60, images: [] };\n}\nreturn [{ json: parsed }];"
      },
      "name": "Baca Output AI (JS)",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1100, 0]
    },
    {
      "parameters": {
        "jsCode": "const aiData = $input.first().json;\nconst ctxStr = $('Tarik Data Konteks AI').item.json.dataBarang || '';\n\nlet hasHalu = false;\nlet validImages = [];\n\nif (aiData.images && Array.isArray(aiData.images)) {\n  for (const img of aiData.images) {\n    if (ctxStr.includes(img.url)) {\n      validImages.push(img);\n    } else {\n      hasHalu = true;\n    }\n  }\n}\n\nif (hasHalu && validImages.length === 0) {\n  aiData.reply = \"Maaf kak, kami tidak memiliki foto produk tersebut. Tunggu sebentar saya hubungkan ke admin ya.\";\n  aiData.confidence = 60;\n}\n\naiData.images = validImages;\nreturn [{ json: aiData }];"
      },
      "name": "Validasi Gambar Halu (JS)",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1300, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://localhost/api/n8n/send-message",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "x-n8n-api-key", "value": "GANTI_DENGAN_API_KEY_ANDA" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "conversationId", "value": "={{ $('Webhook Masuk').item.json.body.conversation_id }}" },
            { "name": "body", "value": "={{ $json.reply }}" },
            { "name": "type", "value": "text" }
          ]
        },
        "options": {}
      },
      "name": "Kirim Pesan Teks",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1500, 0]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 3
          },
          "conditions": [
            {
              "id": "conf-check-1",
              "leftValue": "={{ $json.confidence }}",
              "rightValue": 70,
              "operator": {
                "type": "number",
                "operation": "smaller"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "name": "Cek Confidence",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.3,
      "position": [1700, -100]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 3
          },
          "conditions": [
            {
              "id": "intent-check-1",
              "leftValue": "={{ $('Kirim Pesan Teks').item.json.intent || $('Validasi Gambar Halu (JS)').item.json.intent }}",
              "rightValue": "closing",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "name": "Cek Closing",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.3,
      "position": [1900, 100]
    },
    {
      "parameters": {
        "method": "PUT",
        "url": "=https://localhost/api/n8n/conversations/{{ $('Webhook Masuk').item.json.body.conversation_id }}/handler",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "x-n8n-api-key", "value": "GANTI_DENGAN_API_KEY_ANDA" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "handler", "value": "human" }
          ]
        },
        "options": {}
      },
      "name": "Update Mode ke Admin",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1900, -250]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://localhost/api/n8n/orders",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "x-n8n-api-key", "value": "GANTI_DENGAN_API_KEY_ANDA" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "conversation_id", "value": "={{ $('Webhook Masuk').item.json.body.conversation_id }}" },
            { "name": "type", "value": "sale" },
            { "name": "status", "value": "pending" },
            { "name": "address", "value": "={{ $('Validasi Gambar Halu (JS)').item.json.address }}" },
            { "name": "amount", "value": "={{ $('Validasi Gambar Halu (JS)').item.json.amount || 0 }}" },
            { "name": "items", "value": "={{ $('Validasi Gambar Halu (JS)').item.json.items }}" },
            { "name": "note", "value": "={{ $('Validasi Gambar Halu (JS)').item.json.note }}" }
          ]
        },
        "options": {}
      },
      "name": "Simpan Orderan",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [2100, 0]
    },
    {
      "parameters": {
        "batchSize": 1,
        "options": {}
      },
      "name": "Loop Gambar",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 2,
      "position": [2300, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://localhost/api/n8n/send-message",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "x-n8n-api-key", "value": "GANTI_DENGAN_API_KEY_ANDA" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "conversationId", "value": "={{ $('Webhook Masuk').item.json.body.conversation_id }}" },
            { "name": "type", "value": "image" },
            { "name": "mediaUrl", "value": "={{ $json.url }}" },
            { "name": "body", "value": "={{ $json.caption }}" }
          ]
        },
        "options": {}
      },
      "name": "Kirim Gambar",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [2500, 200]
    }
  ],
  "connections": {
    "Webhook Masuk": {
      "main": [
        [ { "node": "Tarik Data Konteks AI", "type": "main", "index": 0 } ]
      ]
    },
    "Tarik Data Konteks AI": {
      "main": [
        [ { "node": "Tarik Riwayat Chat", "type": "main", "index": 0 } ]
      ]
    },
    "Tarik Riwayat Chat": {
      "main": [
        [ { "node": "Format Prompt AI (JS)", "type": "main", "index": 0 } ]
      ]
    },
    "Format Prompt AI (JS)": {
      "main": [
        [ { "node": "AI Agent (Otak Chatbot)", "type": "main", "index": 0 } ]
      ]
    },
    "AI Agent (Otak Chatbot)": {
      "main": [
        [ { "node": "Baca Output AI (JS)", "type": "main", "index": 0 } ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [ { "node": "AI Agent (Otak Chatbot)", "type": "ai_languageModel", "index": 0 } ]
      ]
    },
    "Tool: Cek Provinsi": {
      "ai_tool": [
        [ { "node": "AI Agent (Otak Chatbot)", "type": "ai_tool", "index": 0 } ]
      ]
    },
    "Tool: Cek Kabupaten/Kota": {
      "ai_tool": [
        [ { "node": "AI Agent (Otak Chatbot)", "type": "ai_tool", "index": 0 } ]
      ]
    },
    "Tool: Cek Kecamatan": {
      "ai_tool": [
        [ { "node": "AI Agent (Otak Chatbot)", "type": "ai_tool", "index": 0 } ]
      ]
    },
    "Tool: Cek Desa/Kelurahan": {
      "ai_tool": [
        [ { "node": "AI Agent (Otak Chatbot)", "type": "ai_tool", "index": 0 } ]
      ]
    },
    "Baca Output AI (JS)": {
      "main": [
        [ { "node": "Validasi Gambar Halu (JS)", "type": "main", "index": 0 } ]
      ]
    },
    "Validasi Gambar Halu (JS)": {
      "main": [
        [ { "node": "Kirim Pesan Teks", "type": "main", "index": 0 } ]
      ]
    },
    "Kirim Pesan Teks": {
      "main": [
        [ { "node": "Cek Confidence", "type": "main", "index": 0 } ]
      ]
    },
    "Cek Confidence": {
      "main": [
        [ { "node": "Update Mode ke Admin", "type": "main", "index": 0 } ],
        [ { "node": "Cek Closing", "type": "main", "index": 0 } ]
      ]
    },
    "Update Mode ke Admin": {
      "main": [
        [ { "node": "Loop Gambar", "type": "main", "index": 0 } ]
      ]
    },
    "Cek Closing": {
      "main": [
        [ { "node": "Simpan Orderan", "type": "main", "index": 0 } ],
        [ { "node": "Loop Gambar", "type": "main", "index": 0 } ]
      ]
    },
    "Simpan Orderan": {
      "main": [
        [ { "node": "Loop Gambar", "type": "main", "index": 0 } ]
      ]
    },
    "Loop Gambar": {
      "main": [
        [ { "node": "Kirim Gambar", "type": "main", "index": 0 } ]
      ]
    },
    "Kirim Gambar": {
      "main": [
        [ { "node": "Loop Gambar", "type": "main", "index": 0 } ]
      ]
    }
  }
};

fs.writeFileSync('workflow/new_ai_workflow.json', JSON.stringify(workflow, null, 2));
console.log('Successfully generated workflow/new_ai_workflow.json');
