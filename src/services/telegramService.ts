interface TelegramResponse {
success: boolean;
message: string;
data: any;
}

interface SendMessageParams {
  message: string;
  fields: string[];
  channelId: string;
  file?: File | null;
}

export class TelegramService {
  private static readonly API_URL = 'https://pech-server.ru/api/send-telegram';

  static async sendMessage({ message, channelId, file, fields }: SendMessageParams): Promise<TelegramResponse> {
    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('channelId', channelId);
      formData.append('fields', JSON.stringify(fields));

      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(this.API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

		const result: TelegramResponse = await response.json();
		console.log('Telegram response:', result);
      return result;
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      throw error;
    }
  }
}
