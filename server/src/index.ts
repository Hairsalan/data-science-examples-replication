import { app } from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

app.listen(PORT, () => {
  console.log(`🚀 Todo API Server running at http://localhost:${PORT}`);
});
