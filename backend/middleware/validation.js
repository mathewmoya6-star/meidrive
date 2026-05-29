// middleware/validation.js
import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Validation failed'
        });
    }
    next();
};

// Course validation rules
export const validateCourse = [
    body('title').notEmpty().withMessage('Title is required').trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('duration_hours').isInt({ min: 1 }).withMessage('Duration must be at least 1 hour'),
    body('level').isIn(['beginner', 'intermediate', 'advanced', 'professional', 'refresher']),
    handleValidationErrors
];

// Enrollment validation
export const validateEnrollment = [
    body('course_id').isInt().withMessage('Valid course ID required'),
    handleValidationErrors
];

// Payment validation
export const validatePayment = [
    body('phoneNumber').matches(/^(07|01|\+254|254)\d{8}$/).withMessage('Invalid phone number format'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1 KES'),
    body('course_id').isInt().withMessage('Valid course ID required'),
    handleValidationErrors
];

// User validation
export const validateUser = [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidationErrors
];

// Pagination validation
export const validatePagination = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidationErrors
];

export default {
    handleValidationErrors,
    validateCourse,
    validateEnrollment,
    validatePayment,
    validateUser,
    validatePagination
};
