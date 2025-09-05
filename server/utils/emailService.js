const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configuração para desenvolvimento (usando console como fallback)
    this.transporter = nodemailer.createTransport({
      // Para desenvolvimento, você pode usar um serviço como Gmail, Outlook ou Ethereal
      // Para produção, configure com seu provedor SMTP
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true para porta 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Se não há configurações SMTP, usar modo de desenvolvimento
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️ Configurações SMTP não encontradas, usando modo de desenvolvimento');
      this.developmentMode = true;
    }
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Suporte EON PRO" <noreply@eonpro.com>',
      to: email,
      subject: 'Redefinir sua senha - EON PRO',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinir Senha</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #00d4aa 0%, #00b89c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #00d4aa 0%, #00b89c 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>EON PRO</h1>
                    <p>Plataforma de Trading Inteligente</p>
                </div>
                
                <div class="content">
                    <h2>Redefinir sua senha</h2>
                    <p>Olá <strong>${userName}</strong>,</p>
                    <p>Recebemos uma solicitação para redefinir a senha da sua conta. Se foi você quem fez essa solicitação, clique no botão abaixo:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="button">REDEFINIR SENHA</a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Importante:</strong>
                        <ul>
                            <li>Este link é válido por apenas <strong>1 hora</strong></li>
                            <li>Se você não solicitou a redefinição, ignore este email</li>
                            <li>Sua senha atual continuará funcionando normalmente</li>
                        </ul>
                    </div>
                    
                    <p>Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:</p>
                    <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                        ${resetUrl}
                    </p>
                    
                    <p>Se você não solicitou esta redefinição de senha, pode ignorar este email com segurança.</p>
                    
                    <p>Atenciosamente,<br>
                    <strong>Equipe EON PRO</strong></p>
                </div>
                
                <div class="footer">
                    <p>Este é um email automático, não responda a este endereço.</p>
                    <p>&copy; 2025 EON PRO - Plataforma de Trading Inteligente</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
        Olá ${userName},

        Recebemos uma solicitação para redefinir a senha da sua conta EON PRO.

        Para redefinir sua senha, acesse o seguinte link:
        ${resetUrl}

        Este link é válido por 1 hora.

        Se você não solicitou esta redefinição, ignore este email.

        Atenciosamente,
        Equipe EON PRO
      `
    };

    try {
      if (this.developmentMode) {
        // Modo de desenvolvimento - apenas log no console
        console.log('\n📧 ===== EMAIL DE DESENVOLVIMENTO =====');
        console.log(`Para: ${email}`);
        console.log(`Assunto: ${mailOptions.subject}`);
        console.log(`Link de redefinição: ${resetUrl}`);
        console.log('=====================================\n');
        return { success: true, messageId: 'development-mode' };
      } else {
        // Modo de produção - enviar email real
        const info = await this.transporter.sendMail(mailOptions);
        console.log('✅ Email de redefinição enviado:', info.messageId);
        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();