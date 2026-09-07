import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log('----------------------------------------------------');
  console.log(`🚀 Serveur ZIHAN Super Delivery Express démarré !`);
  console.log(`📡 Port : ${env.PORT}`);
  console.log(`🌍 Environnement : ${env.NODE_ENV}`);
  console.log(`🩺 Health Check : http://localhost:${env.PORT}/api/health`);
  console.log('----------------------------------------------------');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu. Fermeture du serveur...');
  server.close(() => {
    console.log('Serveur arrêté avec succès.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Signal SIGINT reçu. Fermeture du serveur...');
  server.close(() => {
    console.log('Serveur arrêté avec succès.');
    process.exit(0);
  });
});
