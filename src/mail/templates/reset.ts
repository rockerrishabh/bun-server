import jwt from "jsonwebtoken";

export function resetPasswordTemplate({
  name,
  email,
  token,
}: {
  name: string;
  email: string;
  token: string;
}) {
  const resetPasswordLink = `http://localhost:3000/reset/${token}`;
  const subject = "Reset your password";
  const html = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
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
            <p>Oops you forget your password! Please click the button below to reset your password:</p>
            <a href="${resetPasswordLink}" class="button">Reset Password</a>
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
