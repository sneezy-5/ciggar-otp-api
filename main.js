// const { Client } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');

// const client = new Client();

// client.on('ready', () => {
//     console.log('Client is ready!');
// });

// client.on('qr', qr => {
//     qrcode.generate(qr, {small: true});
// });

// client.initialize();


// import express from "express";
// import { Client, LocalAuth } from "whatsapp-web.js";
// import qrcode from "qrcode-terminal";
// import bodyParser from "body-parser";

const express = require("express");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());


function formatPhoneNumber(phone) {
  let p = phone.toString().trim();
  // Supprime tout sauf chiffres
  p = p.replace(/[^0-9]/g, "");
  // Retire le + si présent
  if (p.startsWith("225")) {
    // tout va bien
  } else if (p.startsWith("0")) {
    p = "225" + p.substring(1);
  } else {
    p = "225" + p;
  }
  return p;
}


function formatIvoirianNumberCustom(rawNumber) {
  let phone = rawNumber.toString().trim();

  // Supprime tout sauf chiffres
  phone = phone.replace(/[^0-9]/g, "");

  // Supprime + si présent
  if (phone.startsWith("+")) phone = phone.substring(1);

  // Si le numéro est déjà avec indicatif pays
  if (phone.startsWith("225")) {
    if (phone.length === 13) {
        // console.log(`225${phone.substring(5)}`)
    // ex: 0701234567 -> 225701234567
    return `225${phone.substring(5)}`;
  }
  }

  // Sinon utiliser tel quel
  return phone;
}



const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./sessions" }),
});

client.on("qr", (qr) => {
  console.log("📱 Scan ce QR Code avec ton WhatsApp pour te connecter :");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Bot WhatsApp connecté et prêt !");
});

client.initialize();

// ✅ Endpoint API pour recevoir les OTP depuis Django
app.post("/send-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone and OTP required" });
    }

    const formattedPhone = formatPhoneNumber(phone)
    const formtN = formatIvoirianNumberCustom(phone)
    const chatId = `${formtN}@c.us`;
    const chatIdNormal = `${formattedPhone}@c.us`;
    // console.log(chatId, chatIdNormal)
    await client.sendMessage(chatId, `🔐 Votre code OTP est : *${otp}*`);
    await client.sendMessage(chatIdNormal, `🔐 Votre code OTP est : *${otp}*`);

    return res.json({ success: true, message: "OTP envoyé avec succès" });
  } catch (err) {
    console.error("Erreur envoi OTP:", err);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

app.listen(3001, () => console.log("🚀 Serveur WhatsApp OTP sur le port 3001"));
