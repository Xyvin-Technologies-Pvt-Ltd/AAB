import multer from 'multer';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to restrict file types
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'text/csv',
        'application/vnd.ms-excel',
        'text/plain',
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.csv'];

    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }
};

// Configure multer
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// Multer configuration for CSV bulk uploads (larger file size)
export const uploadCSV = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for CSV
    },
});

// Middleware for CSV file upload
export const uploadCSVSingle = uploadCSV.single('file');

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for profile picture upload
export const uploadProfilePicture = upload.single('profileImage');

// Middleware for multiple file uploads
export const uploadMultiple = upload.array('files', 10); // Max 10 files

