import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export function send(
  subject: string,
  message: string): Promise<void> {

  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_RECIPIENTS,
    subject,
    text: message
  });
}