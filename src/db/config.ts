export const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "auth",
  port: Number(process.env.DB_PORT) || 5432,
};
