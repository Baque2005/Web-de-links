
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
import path from 'path';
const __dirname = process.cwd();
app.use(express.static(path.join(__dirname, 'build')));

// Para cualquier ruta que no sea API, devolver el index.html del frontend
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Obtener todos los enlaces
app.get('/links', async (req, res) => {
  const { data, error } = await supabase.from('links').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Crear un nuevo enlace
app.post('/links', async (req, res) => {
  const { title, description, category, url } = req.body;
  const { data, error } = await supabase.from('links').insert([
    {
      title,
      description,
      category,
      url,
      views: 0,
      tags: [],
      date: new Date().toLocaleString(),
      reports: 0,
      disabled: false
    }
  ]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// Reportar enlace caído
app.patch('/links/:id/report', async (req, res) => {
  const { id } = req.params;
  const { data: linkData, error: getError } = await supabase.from('links').select('*').eq('id', id).single();
  if (getError || !linkData) return res.status(404).json({ error: 'Enlace no encontrado' });
  const newReports = (linkData.reports || 0) + 1;
  const disabled = newReports >= 5;
  const { error: updateError } = await supabase.from('links').update({ reports: newReports, disabled }).eq('id', id);
  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ success: true, reports: newReports, disabled });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
});
