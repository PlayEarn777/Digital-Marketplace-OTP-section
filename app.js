const SMS_API_KEY = "8f4ccdb0b5970262ae26db7d35cc4ee09efe0377f9f964dd8259216cb4fa605b";
let selectedService = 'wa'; // default WhatsApp
let activeInterval = null;

// Initial load: Fetch services list
window.addEventListener('DOMContentLoaded', () => {
  loadServices();
  fetchBalance();
});

async function fetchBalance() {
  try {
    const res = await fetch(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getBalance`);
    const text = await res.text();
    if(text.includes("ACCESS_BALANCE")) {
      const balance = text.split(":")[1];
      document.getElementById("userBalanceDisplay").innerText = parseFloat(balance).toFixed(2) + "$";
    }
  } catch (e) {
    console.error("Balance fetch error", e);
  }
}

async function loadServices() {
  const grid = document.getElementById("servicesGrid");
  
  // Popular services mapping
  const popularServices = [
    { code: 'wa', name: 'WhatsApp', icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png' },
    { code: 'tg', name: 'Telegram', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png' },
    { code: 'go', name: 'Google/Gmail', icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' },
    { code: 'ig', name: 'Instagram', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png' },
    { code: 'fb', name: 'Facebook', icon: 'https://cdn-icons-png.flaticon.com/512/733/733547.png' },
    { code: 'tw', name: 'Twitter / X', icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968830.png' },
    { code: 'ti', name: 'TikTok', icon: 'https://cdn-icons-png.flaticon.com/512/3046/3046126.png' },
    { code: 'nf', name: 'Netflix', icon: 'https://cdn-icons-png.flaticon.com/512/2504/2504929.png' }
  ];

  grid.innerHTML = "";
  popularServices.forEach(s => {
    const div = document.createElement("div");
    div.className = `service-card ${s.code === selectedService ? 'selected' : ''}`;
    div.innerHTML = `<img src="${s.icon}" alt="${s.name}"><div class="service-name">${s.name}</div>`;
    div.onclick = () => {
      document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
      div.classList.add('selected');
      selectedService = s.code;
      loadPricesForService(s.code);
    };
    grid.appendChild(div);
  });

  // Load initial prices for WhatsApp
  loadPricesForService('wa');
}

async function loadPricesForService(serviceCode) {
  const cGrid = document.getElementById("countriesGrid");
  cGrid.innerHTML = "<p style='color:var(--text-muted);'>Loading live stock and prices from server...</p>";

  try {
    const res = await fetch(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getPrices&service=${serviceCode}&country=0`);
    const data = await res.json();
    
    cGrid.innerHTML = "";
    
    // Sample top country mappings (SMS-Activate ID to Name)
    const countries = [
      { id: 0, name: "Russia (+7)" },
      { id: 1, name: "Ukraine (+380)" },
      { id: 2, name: "Kazakhstan (+7)" },
      { id: 6, name: "Indonesia (+62)" },
      { id: 16, name: "England (+44)" },
      { id: 22, name: "India (+91)" }
    ];

    countries.forEach(c => {
      // Extract price and count if available in API response
      const countryData = data[c.id]?.[serviceCode];
      const price = countryData ? countryData[0]?.cost || '0.50' : '0.45';
      const count = countryData ? countryData[0]?.count || '1500' : '500';

      const card = document.createElement("div");
      card.className = "country-card";
      card.innerHTML = `
        <div class="country-info">
          <div class="c-name">${c.name}</div>
          <div class="c-stock">${count} Numbers in Stock</div>
        </div>
        <div class="country-price">${price}$</div>
      `;
      card.onclick = () => buyNumber(c.id, serviceCode);
      cGrid.appendChild(card);
    });

  } catch (err) {
    cGrid.innerHTML = "<p style='color:red;'>Failed to load live prices. Check your API key or CORS policy.</p>";
  }
}

async function buyNumber(countryId, serviceCode) {
  if(!confirm(`Confirm purchasing a number for ${serviceCode.toUpperCase()}?`)) return;

  document.getElementById("modalPhone").innerText = "Connecting to provider...";
  document.getElementById("modalCode").innerText = "Waiting for SMS code...";
  document.getElementById("activeOrderModal").style.display = "flex";

  try {
    const res = await fetch(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getNumber&service=${serviceCode}&country=${countryId}`);
    const text = await res.text();

    if(text.includes("ACCESS_NUMBER")) {
      const parts = text.split(":");
      const activationId = parts[1];
      const phoneNumber = parts[2];

      document.getElementById("modalPhone").innerText = "+" + phoneNumber;
      pollSmsCode(activationId);
    } else {
      document.getElementById("modalPhone").innerText = "Error: " + text;
    }
  } catch(e) {
    document.getElementById("modalPhone").innerText = "Connection failed!";
  }
}

function pollSmsCode(id) {
  activeInterval = setInterval(async () => {
    try {
      const res = await fetch(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getStatus&id=${id}`);
      const text = await res.text();

      if(text.includes("STATUS_OK")) {
        const code = text.split(":")[1];
        document.getElementById("modalCode").innerText = "CODE: " + code;
        clearInterval(activeInterval);
      } else if(text.includes("STATUS_CANCEL")) {
        document.getElementById("modalCode").innerText = "Order Cancelled / Expired";
        clearInterval(activeInterval);
      }
    } catch(e) {
      console.error(e);
    }
  }, 3000);
}

function closeModal() {
  if(activeInterval) clearInterval(activeInterval);
  document.getElementById("activeOrderModal").style.display = "none";
}