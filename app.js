// Initialize Telegram WebApp Theme
const tg = window.Telegram.WebApp;
tg.expand();

// Credentials
const SUPABASE_URL = "https://urfyvmflnwyludpgxcmo.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_mWeB5Uto-zHSma9VUDQxtg_dEP_P1uq"; 
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SMS_API_KEY = "8f4ccdb0b5970262ae26db7d35cc4ee09efe0377f9f964dd8259216cb4fa605b";

// Public CORS proxy to bypass browser restrictions completely for free
const PROXY_URL = "https://corsproxy.io/?";

let currentService = 'wa';
let activePollInterval = null;

window.addEventListener('DOMContentLoaded', () => {
  loadServices();
  fetchAccountBalance();
});

async function fetchAccountBalance() {
  try {
    const targetUrl = encodeURIComponent(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getBalance`);
    const res = await fetch(PROXY_URL + targetUrl);
    const text = await res.text();
    if(text.includes("ACCESS_BALANCE")) {
      const bal = text.split(":")[1];
      document.getElementById("balanceDisplay").innerText = parseFloat(bal).toFixed(2) + "$";
    }
  } catch (e) {
    console.error("Balance error", e);
  }
}

const services = [
  { code: 'wa', name: 'WhatsApp' },
  { code: 'tg', name: 'Telegram' },
  { code: 'go', name: 'Google' },
  { code: 'ig', name: 'Instagram' },
  { code: 'fb', name: 'Facebook' },
  { code: 'tw', name: 'Twitter' },
  { code: 'ti', name: 'TikTok' },
  { code: 'nf', name: 'Netflix' }
];

function loadServices() {
  const grid = document.getElementById("servicesGrid");
  grid.innerHTML = "";
  
  services.forEach(s => {
    const btn = document.createElement("div");
    btn.className = `service-btn ${s.code === currentService ? 'selected' : ''}`;
    btn.innerText = s.name;
    btn.onclick = () => {
      document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentService = s.code;
      loadCountriesAndPrices(s.code);
    };
    grid.appendChild(btn);
  });

  loadCountriesAndPrices('wa');
}

async function loadCountriesAndPrices(serviceCode) {
  const list = document.getElementById("countryList");
  list.innerHTML = "<p style='text-align:center; color:#64748b;'>Loading live stock...</p>";

  try {
    const targetUrl = encodeURIComponent(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getPrices&service=${serviceCode}&country=0`);
    const res = await fetch(PROXY_URL + targetUrl);
    const data = await res.json();

    list.innerHTML = "";
    
    const topCountries = [
      { id: 0, name: "Russia (+7)" },
      { id: 6, name: "Indonesia (+62)" },
      { id: 16, name: "England (+44)" },
      { id: 22, name: "India (+91)" }
    ];

    topCountries.forEach(c => {
      const countryInfo = data[c.id]?.[serviceCode];
      const price = countryInfo ? countryInfo[0]?.cost || '0.50' : '0.45';
      const count = countryInfo ? countryInfo[0]?.count || '1200' : '300';

      const item = document.createElement("div");
      item.className = "country-item";
      item.innerHTML = `
        <div>
          <div class="c-name">${c.name}</div>
          <div class="c-stock">Stock: ${count} available</div>
        </div>
        <div class="c-price">${price}$</div>
      `;
      item.onclick = () => rentNumber(c.id, serviceCode);
      list.appendChild(item);
    });

  } catch (err) {
    list.innerHTML = "<p style='color:red; text-align:center;'>Failed to connect to provider API.</p>";
  }
}

async function rentNumber(countryId, serviceCode) {
  if(!confirm(`Confirm buying ${serviceCode.toUpperCase()} number?`)) return;

  document.getElementById("modalPhone").innerText = "Requesting number...";
  document.getElementById("modalCode").innerText = "Waiting for SMS code...";
  document.getElementById("orderModal").style.display = "flex";

  try {
    const targetUrl = encodeURIComponent(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getNumber&service=${serviceCode}&country=${countryId}`);
    const res = await fetch(PROXY_URL + targetUrl);
    const text = await res.text();

    if(text.includes("ACCESS_NUMBER")) {
      const parts = text.split(":");
      const activationId = parts[1];
      const phoneNumber = parts[2];

      document.getElementById("modalPhone").innerText = "+" + phoneNumber;
      startSmsPolling(activationId);
    } else {
      document.getElementById("modalPhone").innerText = "Response: " + text;
    }
  } catch(e) {
    document.getElementById("modalPhone").innerText = "Network error!";
  }
}

function startSmsPolling(id) {
  activePollInterval = setInterval(async () => {
    try {
      const targetUrl = encodeURIComponent(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getStatus&id=${id}`);
      const res = await fetch(PROXY_URL + targetUrl);
      const text = await res.text();

      if(text.includes("STATUS_OK")) {
        const code = text.split(":")[1];
        document.getElementById("modalCode").innerText = "CODE: " + code;
        clearInterval(activePollInterval);
      } else if(text.includes("STATUS_CANCEL")) {
        document.getElementById("modalCode").innerText = "Order Cancelled";
        clearInterval(activePollInterval);
      }
    } catch(e) {
      console.error(e);
    }
  }, 3000);
}

function closeModal() {
  if(activePollInterval) clearInterval(activePollInterval);
  document.getElementById("orderModal").style.display = "none";
}