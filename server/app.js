import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import productsRouter from './routes/products.js';
import usersRouter from './routes/users.js';

const app = express();

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = join(__dirname, '..');

app.use(express.json());
app.use(express.static(staticDir));

app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);

export default app;
