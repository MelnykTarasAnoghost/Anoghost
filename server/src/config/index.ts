// src/config.ts

import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars: string[] = [
  'PORT',
  'FRONTEND_URL',
  'TOKEN_SECRET',
  'SOLANA_RPC_URL',
  'IRYS_URL',
  'SERVER_PRIVATE_KEY_BASE58',
  'SERVER_PUBLIC_KEY',
  'NFT_IMAGE_URI',
  'MASTER_SECRET',
  'NODE_ENV',
  'MEDIASOUP_API_URL',
  'MEDIASOUP_INTERNAL_SECRET'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`FATAL_ERROR: Missing required environment variable: ${varName}`);
  }
}

export const config = Object.freeze({
  PORT: parseInt(process.env.PORT!, 10),
  FRONTEND_URL: process.env.FRONTEND_URL!,
  TOKEN_SECRET: process.env.TOKEN_SECRET!,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL!,
  IRYS_URL: process.env.IRYS_URL!,
  SERVER_PRIVATE_KEY_BASE58: process.env.SERVER_PRIVATE_KEY_BASE58!,
  SERVER_PUBLIC_KEY: process.env.SERVER_PUBLIC_KEY!,
  NFT_IMAGE_URI: process.env.NFT_IMAGE_URI!,
  MASTER_SECRET: process.env.MASTER_SECRET!,
  NODE_ENV: process.env.NODE_ENV!,
  MEDIASOUP_API_URL: process.env.MEDIASOUP_API_URL!,
  MEDIASOUP_INTERNAL_SECRET: process.env.MEDIASOUP_INTERNAL_SECRET!
});