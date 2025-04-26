import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

app.post("/webhook", async (req, res) => {
  const order = req.body;
  const orderId = order.id;

  let customerPhone = "";
  let serviceDate = "";

  if (order.note_attributes && order.note_attributes.length > 0) {
    order.note_attributes.forEach(attr => {
      if (attr.name === "Customer phone" || attr.name === "[Customer phone]") {
        customerPhone = attr.value;
      }
      if (attr.name === "Service date" || attr.name === "[Service date]") {
        serviceDate = attr.value;
      }
    });
  }

  if (customerPhone || serviceDate) {
    try {
      await axios({
        method: "PUT",
        url: `https://${SHOPIFY_STORE}/admin/api/2023-07/orders/${orderId}.json`,
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        data: {
          order: {
            id: orderId,
            note_attributes: [
              { name: "Telefonnummer", value: customerPhone },
              { name: "Mietdatum", value: serviceDate }
            ],
          },
        },
      });
      console.log(`Order ${orderId} updated successfully.`);
    } catch (error) {
      console.error("Error updating order:", error.response?.data || error.message);
    }
  }

  res.status(200).send("Webhook received");
});

app.listen(3000, () => {
  console.log("Server läuft auf Port 3000");
});