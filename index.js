import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import express from "express";
import pino from "pino";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("WhatsApp bot çalışıyor.");
});

app.listen(PORT, () => {
  console.log("HTTP server çalışıyor:", PORT);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ WhatsApp bağlantısı kuruldu");

      if (!state.creds.registered) {
        const phoneNumber = "905102211214";

        try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log("📱 Pairing Code:", code);
        } catch (err) {
          console.log("❌ Pairing Code alınamadı:", err.message);
        }
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log("❌ Bağlantı kapandı.");

      if (shouldReconnect) {
        startBot();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    if (!text) return;

    if (text === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "pong 🏓"
      });
    }
  });
}

startBot();
