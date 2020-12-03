import nodemailer from "nodemailer";
import { fromString as htmlToText } from "html-to-text"
import ReactDOMServer from 'react-dom/server';

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
  message: JSX.Element): Promise<void> {
  const html =  ReactDOMServer.renderToString(message)
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_RECIPIENTS,
    subject,
    text: htmlToText(html),
    html
  });
}