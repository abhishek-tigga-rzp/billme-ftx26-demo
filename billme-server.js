/**
 * Billme Demo Creator — Local Proxy Server
 * Run: node billme-server.js
 * Then open: http://localhost:3000
 *
 * No npm install needed — uses only Node.js built-in modules.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const RAZORPAY_HOST = "api.razorpay.com";
const RAZORPAY_PATH = "/v1/bills";
const AUTH = "Basic cnpwX2xpdmVfT1l0SEJ5Y0ZSdjV5cDM6U3J5Q0dtRXE4OHBaMXZwUG5xNFVDN215";

// ─── HTML Page ────────────────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Billme Demo Creator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f5f7;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.10);
      padding: 40px 36px;
      width: 100%;
      max-width: 440px;
    }
    .banner { width: 100%; margin-bottom: 28px; }
    .banner img { width: 100%; height: auto; display: block; }
    h2 { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 28px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    input {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      font-size: 15px;
      color: #1a1a2e;
      background: #f9fafb;
      outline: none;
      transition: border-color 0.15s;
      margin-bottom: 18px;
    }
    input:focus { border-color: #528FF0; background: #fff; }
    input.error { border-color: #ef4444; }
    .field-error { font-size: 12px; color: #ef4444; margin-top: -14px; margin-bottom: 14px; display: none; }
    .receipt-preview {
      background: #f0f4ff;
      border: 1px solid #c7d8fb;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: #374151;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .receipt-preview .label { font-weight: 600; color: #4b5563; margin-bottom: 0; font-size: 12px; }
    .receipt-preview .value { font-family: monospace; color: #1d4ed8; font-size: 13px; font-weight: 600; }
    button {
      width: 100%;
      padding: 13px;
      background: #528FF0;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    button:hover { background: #3b7de8; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .refresh-btn {
      width: auto;
      padding: 6px 12px;
      font-size: 12px;
      background: #e0e7ff;
      color: #3730a3;
      border-radius: 6px;
    }
    .refresh-btn:hover { background: #c7d2fe; }
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: none;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .result {
      margin-top: 20px;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 13px;
      display: none;
    }
    .result.success { background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; }
    .result.error { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
    .result-title { font-weight: 700; font-size: 14px; margin-bottom: 6px; }
    .result-body { font-family: monospace; font-size: 12px; word-break: break-all; max-height: 120px; overflow-y: auto; white-space: pre-wrap; }
    .bill-link { display: inline-block; margin-top: 10px; color: #1d4ed8; font-weight: 600; text-decoration: none; font-size: 13px; }
    .bill-link:hover { text-decoration: underline; }
    .note { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
<div class="card">
  <div class="banner">
    <img src="/assets/RZP FTX 26 ALT (1).png" alt="Billme Demo" />
  </div>
  <h2>Create Demo Digital Bill</h2>
  <p class="subtitle">Fill in the customer details to generate a live Billme demo.</p>

  <label for="name">Customer Name</label>
  <input type="text" id="name" placeholder="e.g. Pankaj Chaudhary" autocomplete="off" />
  <div class="field-error" id="name-error">Please enter a customer name.</div>

  <label for="mobile">Mobile Number</label>
  <input type="tel" id="mobile" placeholder="e.g. 9999999999" maxlength="10" autocomplete="off" />
  <div class="field-error" id="mobile-error">Please enter a valid 10-digit mobile number.</div>

  <div class="receipt-preview">
    <div>
      <div class="label">Receipt Number (auto-generated)</div>
      <div class="value" id="receipt-display">—</div>
    </div>
    <button class="refresh-btn" onclick="refreshReceipt()">Refresh</button>
  </div>

  <button id="submit-btn" onclick="submitBill()">
    <span id="btn-text">Create Bill</span>
    <div class="spinner" id="spinner"></div>
  </button>

  <div class="result" id="result-box">
    <div class="result-title" id="result-title"></div>
    <div class="result-body" id="result-body"></div>
    <a class="bill-link" id="bill-link" href="#" target="_blank" style="display:none">View Bill →</a>
  </div>

  <p class="note">For internal use only · Razorpay Billme Team</p>
</div>

<script>
  const RECEIPT_PREFIX = "INV000d21b255";
  let currentReceipt = "";

  function generateReceipt() {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return RECEIPT_PREFIX + suffix;
  }

  function refreshReceipt() {
    currentReceipt = generateReceipt();
    document.getElementById("receipt-display").textContent = currentReceipt;
  }

  refreshReceipt();

  function validate() {
    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    let valid = true;

    if (!name) {
      document.getElementById("name").classList.add("error");
      document.getElementById("name-error").style.display = "block";
      valid = false;
    } else {
      document.getElementById("name").classList.remove("error");
      document.getElementById("name-error").style.display = "none";
    }

    if (!/^\\d{10}$/.test(mobile)) {
      document.getElementById("mobile").classList.add("error");
      document.getElementById("mobile-error").style.display = "block";
      valid = false;
    } else {
      document.getElementById("mobile").classList.remove("error");
      document.getElementById("mobile-error").style.display = "none";
    }

    return valid;
  }

  async function submitBill() {
    if (!validate()) return;

    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    refreshReceipt();

    const btn = document.getElementById("submit-btn");
    const spinner = document.getElementById("spinner");
    const btnText = document.getElementById("btn-text");
    const resultBox = document.getElementById("result-box");

    btn.disabled = true;
    spinner.style.display = "block";
    btnText.textContent = "Creating...";
    resultBox.style.display = "none";

    const payload = {
      store_code: "PROD_TEST",
      business_type: "retail",
      business_category: "retail_and_consumer_goods",
      receipt_number: currentReceipt,
      customer: {
        contact: mobile,
        name: name,
        email: "",
        customer_id: "",
        age: 12,
        profession: "",
        company_name: "",
        marital_status: "married",
        spouse_name: "",
        anniversary_date: "",
        gender: "male",
        gstin: "",
        billing_address: { address_line_1: "Razorpay FTX Venue", address_line_2: "", landmark: "", city: "", province: "", pin_code: "", country: "" },
        shipping_address: { address_line_1: "Razorpay FTX Venue", address_line_2: "", landmark: "", city: "", province: "", pin_code: "", country: "" }
      },
      loyalty: { type: "cashback", card_num: "", card_holder_name: "", wallet_amount: 0, amount_saved: 0, points_earned: 26, points_redeemed: 0, points_available: 0, points_balance: 0 },
      receipt_timestamp: Math.floor(Date.now() / 1000),
      receipt_type: "tax_invoice",
      receipt_delivery: "digital_and_print",
      bar_code_number: "",
      qr_code_number: "",
      billing_pos_number: "0000",
      pos_category: "traditional_pos",
      order_number: "",
      order_service_type: "",
      cashier_name: "Rahul Sharma",
      cashier_code: "RS01",
      line_items: [
        { name: "Smash Burger", quantity: 1, unit_amount: 39900, description: "", hsn_code: "", product_code: "", product_uid: "", discount: 0, discount_description: "", total_amount: 39900, brand: "", style: "", colour: "", size: "", financier_data: { reference: "", name: "" }, taxes: [{ name: "cgst", percentage: 2.5, amount: 1000 }, { name: "sgst", percentage: 2.5, amount: 1000 }] },
        { name: "Cold Beverage", quantity: 1, unit_amount: 12000, description: "", hsn_code: "", product_code: "", product_uid: "", discount: 0, discount_description: "", total_amount: 12000, brand: "", style: "", colour: "", size: "", financier_data: { reference: "", name: "" }, taxes: [{ name: "cgst", percentage: 2.5, amount: 300 }, { name: "sgst", percentage: 2.5, amount: 300 }] }
      ],
      receipt_summary: { total_quantity: 2, sub_total_amount: 51900, currency: "INR", net_payable_amount: 54500, payment_status: "success", delivery_charges: 0, cod_charges: 0, change_amount: 0, roundup_amount: 0, total_discount_percent: 0, total_discount_amount: 0, discounts: [], used_wallet_amount: 0 },
      taxes: [{ name: "cgst", percentage: 2.5, amount: 1300 }, { name: "sgst", percentage: 2.5, amount: 1300 }],
      payments: [{ method: "UPI", currency: "INR", amount: 54500, payment_reference_id: "" }],
      event: { name: "Razorpay FTX 2026", start_timestamp: 946684802, end_timestamp: 946684805, location: "Razorpay FTX Venue", room: "" }
    };

    try {
      const response = await fetch("/api/create-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      resultBox.style.display = "block";
      const billLink = document.getElementById("bill-link");

      if (response.ok) {
        resultBox.className = "result success";
        document.getElementById("result-title").innerHTML = "✅ Bill Created Successfully!";
        document.getElementById("result-body").textContent =
          "Receipt: " + currentReceipt + "\\nID: " + (data.id || "—");

        const url = data.short_url || data.bill_url || data.url;
        if (url) {
          billLink.href = url;
          billLink.style.display = "inline-block";
        } else {
          billLink.style.display = "none";
        }
        refreshReceipt();
      } else {
        resultBox.className = "result error";
        document.getElementById("result-title").innerHTML = "❌ Error " + response.status;
        document.getElementById("result-body").textContent = JSON.stringify(data, null, 2);
        billLink.style.display = "none";
      }
    } catch (err) {
      resultBox.style.display = "block";
      resultBox.className = "result error";
      document.getElementById("result-title").innerHTML = "❌ Error";
      document.getElementById("result-body").textContent = err.message;
      document.getElementById("bill-link").style.display = "none";
    } finally {
      btn.disabled = false;
      spinner.style.display = "none";
      btnText.textContent = "Create Bill";
    }
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") submitBill(); });
</script>
</body>
</html>`;

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {

  // Serve the HTML page
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  // Serve static assets from ./assets/
  if (req.method === "GET" && req.url.startsWith("/assets/")) {
    const filePath = path.join(__dirname, decodeURIComponent(req.url));
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(data);
    });
    return;
  }

  // Proxy endpoint — forwards POST to Razorpay
  if (req.method === "POST" && req.url === "/api/create-bill") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const options = {
        hostname: RAZORPAY_HOST,
        path: RAZORPAY_PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": AUTH,
          "kong-debug": "1",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          res.writeHead(proxyRes.statusCode, {
            "Content-Type": "application/json",
          });
          res.end(data);
        });
      });

      proxyReq.on("error", (err) => {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Proxy error", message: err.message }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // 404 for anything else
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n  Billme Demo Creator is running!`);
  console.log(`  Open in browser: http://localhost:${PORT}\n`);
});
