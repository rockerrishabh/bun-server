import { createTransport } from "nodemailer";

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const options = await transporter.sendMail({
      from: `"Coding Duniya 👻" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
    });
    return options;
  } catch (error) {
    console.log(error);
  }
};
