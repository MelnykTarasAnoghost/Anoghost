// generateWallet.js
import { Keypair } from "@solana/web3.js";
import fs from "fs";

// Генерация нового кошелька
const keypair = Keypair.generate();
const secretKey = Array.from(keypair.secretKey);

// Сохраняем в wallet.json
fs.writeFileSync("wallet.json", JSON.stringify(secretKey));

console.log("✅ wallet.json создан!");
console.log("💳 Публичный ключ:", keypair.publicKey.toBase58());
