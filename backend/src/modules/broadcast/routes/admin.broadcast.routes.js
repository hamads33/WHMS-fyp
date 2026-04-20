const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/broadcast.controller');
const storagePathsService = require('../../settings/storage-paths.service');

const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const dir = await storagePathsService.resolve("broadcastsPath");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${sanitized}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/gif',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter,
});

// Routes
router.post('/', upload.single('file'), controller.createBroadcast);
router.get('/', controller.listBroadcasts);
router.get('/time', controller.getServerTime);
router.get('/:id', controller.getBroadcast);
router.put('/:id', controller.updateBroadcast);
router.delete('/:id', controller.deleteBroadcast);
router.get('/:id/engagement', controller.getEngagement);

module.exports = router;
