const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server läuft 🚀');
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const order = req.body;
    let phoneValue = null;
    let dateValue = null;
    if (order.note_attributes && Array.isArray(order.note_attributes)) {
      for (const attr of order.note_attributes) {
        if (attr.name === 'Customer phone') {
          phoneValue = attr.value;
        }
        if (attr.name === 'Service date') {
          dateValue = attr.value;
        }
      }
    }
    const updatedAttributes = [];
    if (phoneValue !== null) {
      updatedAttributes.push({ name: 'Customer phone', value: phoneValue });
    }
    if (dateValue !== null) {
      updatedAttributes.push({ name: 'Service date', value: dateValue });
    }
    if (order.id && updatedAttributes.length > 0) {
      const store = process.env.SHOPIFY_STORE;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      const url = `https://${store}.myshopify.com/admin/api/2023-10/orders/${order.id}.json`;
      await axios.put(url, { order: { id: order.id, note_attributes: updatedAttributes } }, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Failed to process Shopify webhook:', error);
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
