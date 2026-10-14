const nodemailer = require('nodemailer') //https://www.npmjs.com/package/nodemailer

const send_email = async (options) => { //more methods to use email https://chat.deepseek.com/share/7m7hyt2i2zik3d4xge
    const transporter = nodemailer.createTransport({
        host: process.env.email_host,
        port: Number(process.env.email_port),
        secure: false, // true for 465, false for 587
        auth: {
            user: process.env.email_user,
            pass: process.env.email_password
        }

    })

    await transporter.verify();

    const email_options = {
        from: `"Data Team support" <${process.env.email_user}>`, // Use your email as sender
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.message.replace(/\n/g, '<br>')
    }

    return await transporter.sendMail(email_options)

}


module.exports = send_email