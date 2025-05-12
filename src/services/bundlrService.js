// src/services/bundlrService.js
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { getProvider } from '../utils/getProvider';

let bundlr;

// Функция для инициализации Bundlr
export const initializeBundlr = async () => {
  try {
    const provider = await getProvider();
    
    // Проверяем, что provider доступен
    if (!provider) {
      console.error('Provider is not available');
      return;
    }
    
    // Используем provider для создания соединения с Solana
    const connection = provider.connection;
if(!connection)
    bundlr = new Connection(clusterApiUrl(WalletAdapterNetwork.Mainnet));
    console.log("Bundlr connection established", bundlr);

    // Здесь можно добавить дополнительные действия с `provider`, если необходимо

  } catch (error) {
    console.error('Error initializing Bundlr:', error);
  }
};

// Функция для загрузки сообщений
export const fetchMessages = async (walletAddress) => {
  try {
    // Логика для получения сообщений
    const response = await fetch(`/api/messages?address=${walletAddress}`);

    // Проверяем, что ответ не является ошибкой
    if (!response.ok) {
      throw new Error(`Failed to fetch messages. Status: ${response.status}`);
    }

    // Пытаемся распарсить JSON
    const messages = await response.json();
    return messages;

  } catch (error) {
    // Логируем ошибки
    console.error('Error fetching messages:', error);
    return [];
  }
};

// Функция для отправки сообщений
export const sendMessage = async (message, walletAddress) => {
  try {
    const response = await fetch('/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: walletAddress,
        message: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message. Status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

