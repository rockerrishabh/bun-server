import jwt from "jsonwebtoken";

export function verificationTemplate({
  name,
  email,
  token,
}: {
  name: string;
  email: string;
  token: string;
}) {
  const verificationLink = `http://localhost:3000/verify/${token}`;
  const subject = "Verify your email address";
  const html = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        .body {
            margin-bottom: 20px;
        }

        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
        }

        .footer {
            text-align: center;
            font-size: 12px;
            color: #888;
        }
            a {
                color: #ffffff;
            }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email</h1>
        </div>
        <div class="body">
            <p>Hi ${name},</p>
            <p>Thanks for signing up! Please click the button below to verify your email address:</p>
            <a href="${verificationLink}" class="button">Verify Email</a>
        </div>
        <div class="footer">
            &copy; Ai ChatBot 2024
        </div>
    </div>
</body>
</html>
  `;
  return { email, subject, html };
}
