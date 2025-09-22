// Скрипт для получения ID чата/канала
// Запустите: node get-chat-id.js

import readline from 'node:readline';
import fetch from 'node-fetch';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔍 Получение ID Telegram чата/канала');
console.log('=====================================');
console.log('');
console.log('1. Создайте бота через @BotFather');
console.log('2. Получите токен бота');
console.log('3. Добавьте бота в нужный чат/канал');
console.log('4. Напишите боту любое сообщение');
console.log('5. Запустите этот скрипт с токеном бота');
console.log('');

rl.question('Введите токен бота: ', async (botToken) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
    const data = await response.json();
    
    if (!data.ok) {
      console.log('❌ Ошибка:', data.description);
      rl.close();
      return;
    }
    
    console.log('\n📋 Найденные чаты:');
    console.log('==================');
    
    const chats = new Map();
    
    data.result.forEach(update => {
      if (update.message) {
        const chat = update.message.chat;
        const chatId = chat.id;
        const chatTitle = chat.title || chat.first_name || chat.username || 'Без названия';
        const chatType = chat.type;
        
        if (!chats.has(chatId)) {
          chats.set(chatId, {
            id: chatId,
            title: chatTitle,
            type: chatType,
            username: chat.username
          });
        }
      }
    });
    
    if (chats.size === 0) {
      console.log('❌ Чаты не найдены. Убедитесь что:');
      console.log('   - Бот добавлен в чат/канал');
      console.log('   - В чат отправлено хотя бы одно сообщение');
      console.log('   - Токен бота правильный');
    } else {
      chats.forEach(chat => {
        console.log(`\n📱 ${chat.title}`);
        console.log(`   ID: ${chat.id}`);
        console.log(`   Тип: ${chat.type}`);
        if (chat.username) {
          console.log(`   Username: @${chat.username}`);
        }
        console.log(`   Для использования: ${chat.id}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
  
  rl.close();
});
