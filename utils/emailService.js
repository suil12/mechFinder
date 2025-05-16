"use strict";

// In una vera applicazione, utilizza un servizio di invio email come Nodemailer, SendGrid, ecc.
// Per ora, implementiamo solo un mock

exports.sendPasswordResetEmail = async (email, name, resetUrl) => {
    try {
        console.log(`[EMAIL SERVICE] Password reset email sent to ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log(`Email content: Dear ${name}, click the link to reset your password.`);
        
        // In produzione, utilizza Nodemailer o un servizio simile
        /*
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        
        await transporter.sendMail({
            from: '"MechFinder" <noreply@mechfinder.it>',
            to: email,
            subject: 'Reset della password - MechFinder',
            html: `
                <h1>Reset della password</h1>
                <p>Ciao ${name},</p>
                <p>Hai richiesto il reset della password per il tuo account MechFinder.</p>
                <p>Clicca sul link seguente per reimpostare la tua password. Il link è valido per 1 ora.</p>
                <p><a href="${resetUrl}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Reimposta password</a></p>
                <p>Se non hai richiesto il reset della password, ignora questa email.</p>
                <p>Grazie,<br>Il team di MechFinder</p>
            `
        });
        */
        
        return true;
    } catch (err) {
        console.error('Errore nell\'invio dell\'email di reset:', err);
        throw new Error('Errore nell\'invio dell\'email di reset');
    }
};