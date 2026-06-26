function uploadQuestionImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Выберите изображение', field: 'image' });
  }

  return res.status(201).json({
    image_url: `/uploads/questions/${req.file.filename}`,
  });
}

module.exports = {
  uploadQuestionImage,
};
