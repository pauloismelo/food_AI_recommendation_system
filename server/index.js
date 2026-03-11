import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import productsRouter from './routes/products.js';
import usersRouter from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = join(__dirname, '..');

app.use(express.json());

// Serve static frontend files
app.use(express.static(staticDir));

// API routes
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
