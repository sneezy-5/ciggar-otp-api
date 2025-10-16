const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
const app = express();
app.use(express.json());

let clientReady = false;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./sessions" }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
    ],
  },
  // Forcer une version stable de WhatsApp Web
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  }
});

client.on("qr", (qr) => {
  console.log("📱 Scan ce QR Code avec ton WhatsApp pour te connecter :");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Bot WhatsApp connecté et prêt !");
  clientReady = true;
});

client.on("auth_failure", (msg) => {
  console.error("❌ Échec authentification:", msg);
  clientReady = false;
});

client.on("disconnected", (reason) => {
  console.log("❌ Client déconnecté:", reason);
  clientReady = false;
});

client.initialize();

// Fonctions de formatage
function formatPhoneNumber(phone) {
  let p = phone.toString().trim();
  p = p.replace(/[^0-9]/g, "");
  
  if (p.startsWith("225")) {
    return p;
  } else if (p.startsWith("0")) {
    return "225" + p.substring(1);
  } else {
    return "225" + p;
  }
}

function formatIvoirianNumberCustom(rawNumber) {
  let phone = rawNumber.toString().trim();
  phone = phone.replace(/[^0-9]/g, "");
  
  if (phone.startsWith("+")) phone = phone.substring(1);
  
  if (phone.startsWith("225")) {
    if (phone.length === 13) {
      return `225${phone.substring(5)}`;
    }
  }
  
  return phone;
}

// Fonction pour envoyer un message sans vérification
async function sendMessageSafe(chatId, message) {
  try {
    await client.sendMessage(chatId, message);
    console.log(`✅ Message envoyé à ${chatId}`);
    return true;
  } catch (error) {
    // Si l'erreur contient "chat not found", le numéro n'existe pas
    if (error.message.includes("chat not found") || 
        error.message.includes("phone number is not registered")) {
      console.log(`⚠️ ${chatId} n'est pas un compte WhatsApp valide`);
      return false;
    }
    
    // Pour les autres erreurs
    console.warn(`⚠️ Erreur envoi à ${chatId}:`, error.message);
    return false;
  }
}

// ✅ Endpoint API pour recevoir les OTP depuis Django
app.post("/send-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!clientReady) {
      return res.status(503).json({ 
        error: "Client WhatsApp non prêt",
        message: "Le bot WhatsApp n'est pas encore connecté. Veuillez scanner le QR code."
      });
    }

    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone and OTP required" });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const ivoirianPhone = formatIvoirianNumberCustom(phone);
    
    // Créer une liste de numéros possibles (sans doublons)
    const possibleNumbers = [...new Set([ivoirianPhone, formattedPhone])];
    const possibleChatIds = possibleNumbers.map(num => `${num}@c.us`);

    console.log(`📞 Tentative d'envoi OTP à: ${possibleChatIds.join(', ')}`);

    let sent = false;
    let lastError = null;

    // Essayer d'envoyer directement sans vérification préalable
    for (const chatId of possibleChatIds) {
      const success = await sendMessageSafe(chatId, `🔐 Votre code OTP est : *${otp}*`);
      if (success) {
        sent = true;
        break; // Arrêter dès qu'un envoi réussit
      }
    }

    if (!sent) {
      console.log(`❌ Impossible d'envoyer l'OTP au numéro: ${phone}`);
      return res.status(404).json({ 
        error: "Numéro non enregistré sur WhatsApp",
        tried: possibleChatIds
      });
    }

    return res.json({ 
      success: true, 
      message: "OTP envoyé avec succès",
      phone: phone
    });

  } catch (err) {
    console.error("❌ Erreur envoi OTP:", err);
    return res.status(500).json({ 
      error: "Erreur interne",
      details: err.message 
    });
  }
});

// Endpoint pour vérifier le statut
app.get("/status", (req, res) => {
  res.json({
    status: clientReady ? "ready" : "not_ready",
    message: clientReady 
      ? "Bot WhatsApp connecté et prêt" 
      : "Bot WhatsApp en attente de connexion"
  });
});

// Endpoint pour tester l'envoi
app.post("/test-send", async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!clientReady) {
      return res.status(503).json({ error: "Client non prêt" });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const chatId = `${formattedPhone}@c.us`;
    
    const success = await sendMessageSafe(chatId, message || "Test message");
    
    if (success) {
      return res.json({ success: true, message: "Message envoyé" });
    } else {
      return res.status(404).json({ error: "Numéro non trouvé" });
    }
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur WhatsApp OTP sur le port ${PORT}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   - POST /send-otp - Envoyer un OTP`);
  console.log(`   - GET  /status   - Vérifier le statut`);
  console.log(`   - POST /test-send - Tester l'envoi`);
});