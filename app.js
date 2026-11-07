// Initialize Supabase Client with your credentials
const SUPABASE_URL = "https://urfyvmflnwyludpgxcmo.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_mWeB5Uto-zHSma9VUDQxtg_dEP_P1uq"; 
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Your SMS-Activate API Key
const SMS_API_KEY = "8f4ccdb0b5970262ae26db7d35cc4ee09efe0377f9f964dd8259216cb4fa605b";

let activeActivationId = null;

async function buyNumber() {
  const service = document.getElementById("service").value;
  const button = document.querySelector("button");
  button.innerText = "Requesting Number...";
  button.disabled = true;
  
  try {
    // Calling SMS-Activate API to fetch a phone number
    const response = await fetch(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getNumber&service=${service}&country=0`);
    const text = await response.text();
    
    if (text.includes("ACCESS_NUMBER")) {
      const parts = text.split(":");
      const activationId = parts[1];
      const number = parts[2];

      document.getElementById("activeOrder").style.display = "block";
      document.getElementById("phoneNumber"].innerText = "+" + number;
      document.getElementById("smsCode").innerText = "Waiting for SMS code...";
      activeActivationId = activationId;

      // Start polling for the incoming SMS verification code
      checkSmsCode(activationId);
    } else {
      alert("Notice from provider: " + text);
    }
  } catch (err) {
    alert("Connection error: " + err.message);
  } finally {
    button.innerText = "Get Number";
    button.disabled = false;
  }
}

function checkSmsCode(id) {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getStatus&id=${id}`);
      const status = await res.text();

      if (status.includes("STATUS_OK")) {
        const code = status.split(":")[1];
        document.getElementById("smsCode").innerText = "YOUR CODE: " + code;
        clearInterval(interval);
      } else if (status.includes("STATUS_CANCEL")) {
        document.getElementById("smsCode").innerText = "Order Cancelled / Expired";
        clearInterval(interval);
      }
    } catch (e) {
      console.error("Polling error", e);
    }
  }, 3000);
}