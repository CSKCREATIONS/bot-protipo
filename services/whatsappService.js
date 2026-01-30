const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Enviar mensaje de texto
   */
  async sendTextMessage(to, message) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Error enviando mensaje:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Enviar mensaje con imagen
   */
  async sendImageMessage(to, imageUrl, caption = '') {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Error enviando imagen:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId) {
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error marcando como leído:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Enviar respuesta con botones
   */
  async sendButtonMessage(to, bodyText, buttons) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: bodyText
            },
            action: {
              buttons: buttons
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Error enviando botones:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Obtener URL del medio (imagen, video, audio, documento)
   */
  async getMediaUrl(mediaId) {
    try {
      // Primer paso: obtener información del medio
      const mediaInfo = await axios.get(
        `https://graph.facebook.com/v18.0/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      return {
        success: true,
        url: mediaInfo.data.url,
        mimeType: mediaInfo.data.mime_type
      };
    } catch (error) {
      console.error('Error obteniendo URL del medio:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Descargar archivo multimedia
   */
  async downloadMedia(mediaUrl) {
    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        data: response.data,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Error descargando medio:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new WhatsAppService();
