const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CATEGORIES_FILE = path.join(UPLOADS_DIR, 'categories.json');

// Init storage
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(CATEGORIES_FILE)) fs.writeFileSync(CATEGORIES_FILE, JSON.stringify([]));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getCategories = () => JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
const saveCategories = (cats) => fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(cats, null, 2));

// ─── Multer: Photo Upload ─────────────────────────────────────────────────────
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.params.id, 'photos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}.jpg`);
  }
});

// ─── Multer: Reference Upload ─────────────────────────────────────────────────
const refStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'reference.jpg');
  }
});

const uploadPhoto = multer({ storage: photoStorage });
const uploadRef = multer({ storage: refStorage });

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET all categories
app.get('/api/categories', (req, res) => {
  const cats = getCategories();
  // Attach thumbnail (latest photo) and real photo count
  const enriched = cats.map(cat => {
    const photosDir = path.join(UPLOADS_DIR, cat.id, 'photos');
    let thumbnail = null;
    let photoCount = 0;
    if (fs.existsSync(photosDir)) {
      const files = fs.readdirSync(photosDir)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .sort();
      photoCount = files.length;
      if (files.length > 0) {
        thumbnail = `/uploads/${cat.id}/photos/${files[files.length - 1]}`;
      }
    }
    return { ...cat, photoCount, thumbnail };
  });
  res.json(enriched);
});

// POST create category
app.post('/api/categories', (req, res) => {
  const { name, emoji } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const cats = getCategories();
  const newCat = {
    id: uuidv4(),
    name: name.trim(),
    emoji: emoji || '📷',
    createdAt: new Date().toISOString(),
    hasReference: false
  };
  cats.push(newCat);
  saveCategories(cats);

  fs.mkdirSync(path.join(UPLOADS_DIR, newCat.id, 'photos'), { recursive: true });
  res.json(newCat);
});

// DELETE category
app.delete('/api/categories/:id', (req, res) => {
  const cats = getCategories().filter(c => c.id !== req.params.id);
  saveCategories(cats);
  const dir = path.join(UPLOADS_DIR, req.params.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  res.json({ success: true });
});

// GET photos in category (sorted by timestamp)
app.get('/api/categories/:id/photos', (req, res) => {
  const photosDir = path.join(UPLOADS_DIR, req.params.id, 'photos');
  if (!fs.existsSync(photosDir)) return res.json([]);

  const files = fs.readdirSync(photosDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(f => {
      const ts = parseInt(f.replace(/\.[^.]+$/, ''));
      return {
        filename: f,
        url: `/uploads/${req.params.id}/photos/${f}`,
        timestamp: isNaN(ts) ? f : new Date(ts).toISOString(),
        displayTime: isNaN(ts) ? f : new Date(ts).toLocaleString('ko-KR', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        })
      };
    });

  res.json(files);
});

// POST upload photo
app.post('/api/categories/:id/photos', uploadPhoto.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const cats = getCategories();
  const cat = cats.find(c => c.id === req.params.id);

  // If no reference exists yet, auto-set first photo as reference
  if (cat && !cat.hasReference) {
    const refPath = path.join(UPLOADS_DIR, req.params.id, 'reference.jpg');
    fs.copyFileSync(req.file.path, refPath);
    cat.hasReference = true;
    saveCategories(cats);
  }

  res.json({
    filename: req.file.filename,
    url: `/uploads/${req.params.id}/photos/${req.file.filename}`
  });
});

// PUT set / replace reference image
app.put('/api/categories/:id/reference', uploadRef.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const cats = getCategories();
  const cat = cats.find(c => c.id === req.params.id);
  if (cat) {
    cat.hasReference = true;
    saveCategories(cats);
  }

  res.json({ url: `/uploads/${req.params.id}/reference.jpg?t=${Date.now()}` });
});

// DELETE single photo
app.delete('/api/categories/:id/photos/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.id, 'photos', req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ success: true });
});

// POST export MP4
app.post('/api/categories/:id/export', (req, res) => {
  const { secondsPerFrame = 0.5 } = req.body;
  const photosDir = path.join(UPLOADS_DIR, req.params.id, 'photos');

  if (!fs.existsSync(photosDir)) return res.status(400).json({ error: 'No photos directory' });

  const photos = fs.readdirSync(photosDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));

  if (photos.length === 0) return res.status(400).json({ error: 'No photos to export' });

  const outputPath = path.join(UPLOADS_DIR, req.params.id, 'output.mp4');
  const filterFile = path.join(UPLOADS_DIR, req.params.id, 'filter.txt');

  // Build ffmpeg input args: -loop 1 -t <duration> -i <file> for each photo
  // This handles mixed resolutions by scaling every input to a uniform size
  const inputArgs = photos.flatMap(f => [
    '-loop', '1', '-t', String(secondsPerFrame),
    '-i', path.join(photosDir, f)
  ]);

  // Build filter_complex: scale each input to 1080x1920, pad if needed, then concat
  const filters = photos.map((_, i) =>
    `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
  ).join(';\n');
  const concatInputs = photos.map((_, i) => `[v${i}]`).join('');
  const filterComplex = `${filters};\n${concatInputs}concat=n=${photos.length}:v=1:a=0[out]`;
  fs.writeFileSync(filterFile, filterComplex);

  try {
    execSync(
      `ffmpeg -y ${inputArgs.map(a => `"${a}"`).join(' ')} ` +
      `-filter_complex_script "${filterFile}" -map "[out]" ` +
      `-c:v libx264 -preset fast -pix_fmt yuv420p "${outputPath}"`,
      { timeout: 300000 }
    );
  } catch (err) {
    console.error('ffmpeg error:', err.message);
    return res.status(500).json({ error: 'ffmpeg failed', detail: err.message });
  } finally {
    if (fs.existsSync(filterFile)) fs.unlinkSync(filterFile);
  }

  const cats = getCategories();
  const cat = cats.find(c => c.id === req.params.id);
  const filename = `${(cat?.name || 'timelapse').replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}_timelapse.mp4`;

  res.download(outputPath, filename);
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));});

app.listen(49153, '0.0.0.0', () => {
  console.log(`✦ STILL backend running on http://localhost:49153`);
});
