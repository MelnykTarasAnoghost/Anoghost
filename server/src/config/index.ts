// File: server/src/config.ts

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * An array of required environment variables.
 * The server will refuse to start if any of these are missing.
 */
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
  'NODE_ENV'
];

// Check for missing environment variables
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`FATAL_ERROR: Missing required environment variable: ${varName}`);
  }
}

/**
 * A frozen, type-safe object that exports all environment variables.
 * Using this ensures that all variables are accessed consistently
 * and provides a single point of configuration.
 */
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
  NODE_ENV: process.env.NODE_ENV
});