import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: Bun.env.SMTP_HOST,
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: Bun.env.SMTP_USER,
    pass: Bun.env.SMTP_PASSWORD,
  },
});

export async function send({
  email,
  subject,
  html,
}: {
  email: string;
  subject: string;
  html: string;
}) {
  const info = await transporter.sendMail({
    from: `"Support Team 👻" <${Bun.env.SMTP_USER}>`,
    to: email,
    subject,
    html,
  });

  console.log("Message sent: %s", info.messageId);
  return info;
}
