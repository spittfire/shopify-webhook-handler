const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Test-Route für Render und Shopify Pings
app.get('/', (req, res) => {
  res.send('Server läuft 🚀');
});

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

app.post('/webhook', async (req, res) => {
  console.log('Webhook received 🚀');
  res.sendStatus(200); // Sofort 200 OK an Shopify zurück

  try {
    const order = req.body;
    const orderId = order.id;

    let customerPhone = "";
    let serviceDate = "";

    if (order.note_attributes && Array.isArray(order.note_attributes)) {
      for (const attr of order.note_attributes) {
        console.log(`Found attribute: ${attr.name} = ${attr.value}`);
        if (attr.name === 'Customer phone' || attr.name === '[Customer phone]') {
          customerPhone = attr.value;
        }
        if (attr.name === 'Service date' || attr.name === '[Service date]') {
          serviceDate = attr.value;
        }
      }
    } else {
      console.log('No note_attributes found.');
    }

    const updatedAttributes = [];
    if (customerPhone) {
      updatedAttributes.push({ name: 'Telefonnummer', value: customerPhone });
    }
    if (serviceDate) {
      updatedAttributes.push({ name: 'Mietdatum', value: serviceDate });
    }

    console.log(`Updating order ${orderId} with attributes:`, updatedAttributes);

    if (orderId && updatedAttributes.length > 0) {
      const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders/${orderId}.json`;
      await axios.put(url, { order: { id: orderId, note_attributes: updatedAttributes } }, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Order ${orderId} updated successfully 🚀`);
    } else {
      console.log('Nothing to update.');
    }
  } catch (error) {
    console.error('Failed to process Shopify webhook:', error.response?.data || error.message);
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
