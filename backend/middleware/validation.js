// middleware/validation.js
// REAL PRODUCTION - MEI DRIVE AFRICA

import { body, param, query, validationResult } from 'express-validator';

// =====================================================
// HANDLE VALIDATION ERRORS
// =====================================================
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            })),
            message: 'Validation failed. Please check your input.'
        });
    }
    next();
};

// =====================================================
// PHONE NUMBER VALIDATION (Kenyan M-Pesa)
// =====================================================
export const validatePhoneNumber = (phone) => {
    // Kenyan phone formats: 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX
    const phoneRegex = /^(?:07|01|\+?254)[0-9]{8}$/;
    return phoneRegex.test(phone);
};

// =====================================================
// COURSE VALIDATION RULES
// =====================================================
export const validateCourse = [
    body('name')
        .notEmpty().withMessage('Course name is required')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Course name must be between 3 and 100 characters'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    
    body('price')
        .isFloat({ min: 49, max: 500000 }).withMessage('Price must be between 49 and 500,000 KES'),
    
    body('icon')
        .optional()
        .trim()
        .matches(/^fa-[a-z-]+$/).withMessage('Invalid icon format. Use Font Awesome class (e.g., fa-car)'),
    
    body('duration')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Duration cannot exceed 50 characters'),
    
    body('units')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Units must be between 1 and 100'),
    
    body('modules')
        .optional()
        .isArray().withMessage('Modules must be an array'),
    
    handleValidationErrors
];

// =====================================================
// COURSE ID PARAM VALIDATION
// =====================================================
export const validateCourseId = [
    param('id')
        .isInt({ min: 1 }).withMessage('Valid course ID is required')
        .toInt(),
    handleValidationErrors
];

// =====================================================
// ENROLLMENT VALIDATION
// =====================================================
export const validateEnrollment = [
    body('course_id')
        .isInt({ min: 1 }).withMessage('Valid course ID is required')
        .toInt(),
    
    body('mpesa_code')
        .optional()
        .trim()
        .isLength({ min: 10, max: 50 }).withMessage('Invalid M-Pesa receipt code'),
    
    body('amount')
        .optional()
        .isFloat({ min: 49 }).withMessage('Amount must be at least 49 KES'),
    
    handleValidationErrors
];

// =====================================================
// PAYMENT VALIDATION (M-PESA)
// =====================================================
export const validatePayment = [
    body('phoneNumber')
        .notEmpty().withMessage('Phone number is required')
        .custom(value => {
            if (!validatePhoneNumber(value)) {
                throw new Error('Invalid Kenyan phone number format. Use 07XXXXXXXX or 2547XXXXXXXX');
            }
            return true;
        }),
    
    body('amount')
        .isFloat({ min: 49, max: 500000 }).withMessage(`Amount must be between 49 and 500,000 KES`),
    
    body('courseId')
        .isInt({ min: 1 }).withMessage('Valid course ID is required')
        .toInt(),
    
    body('courseName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Course name too long'),
    
    handleValidationErrors
];

// =====================================================
// USER VALIDATION (REGISTRATION)
// =====================================================
export const validateUser = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Valid email address is required')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email too long'),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
    
    body('full_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Full name can only contain letters, spaces, apostrophes, and hyphens'),
    
    body('phone')
        .optional()
        .custom(value => {
            if (value && !validatePhoneNumber(value)) {
                throw new Error('Invalid Kenyan phone number format');
            }
            return true;
        }),
    
    handleValidationErrors
];

// =====================================================
// LOGIN VALIDATION
// =====================================================
export const validateLogin = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Valid email address is required')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 1 }).withMessage('Password cannot be empty'),
    
    handleValidationErrors
];

// =====================================================
// PAGINATION VALIDATION
// =====================================================
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),
    
    query('sort')
        .optional()
        .isIn(['asc', 'desc']).withMessage('Sort must be asc or desc'),
    
    handleValidationErrors
];

// =====================================================
// ADMIN USER ROLE VALIDATION
// =====================================================
export const validateUserRole = [
    body('role')
        .notEmpty().withMessage('Role is required')
        .isIn(['user', 'admin', 'instructor', 'moderator']).withMessage('Invalid role. Must be user, admin, instructor, or moderator'),
    
    handleValidationErrors
];

// =====================================================
// M-PESA CALLBACK VALIDATION
// =====================================================
export const validateMpesaCallback = [
    body('Body.stkCallback.CheckoutRequestID')
        .notEmpty().withMessage('CheckoutRequestID is required'),
    
    body('Body.stkCallback.ResultCode')
        .notEmpty().withMessage('ResultCode is required'),
    
    handleValidationErrors
];

// =====================================================
// CHECKOUT REQUEST ID VALIDATION
// =====================================================
export const validateCheckoutRequestId = [
    body('checkoutRequestID')
        .notEmpty().withMessage('CheckoutRequestID is required')
        .isLength({ min: 10, max: 50 }).withMessage('Invalid CheckoutRequestID format'),
    
    handleValidationErrors
];

// =====================================================
// PROGRESS UPDATE VALIDATION
// =====================================================
export const validateProgress = [
    param('enrollmentId')
        .isInt({ min: 1 }).withMessage('Valid enrollment ID is required')
        .toInt(),
    
    body('progress')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100')
        .toInt(),
    
    handleValidationErrors
];

// =====================================================
// PASSWORD RESET VALIDATION
// =====================================================
export const validatePasswordReset = [
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    
    handleValidationErrors
];

// =====================================================
// FORGOT PASSWORD VALIDATION
// =====================================================
export const validateForgotPassword = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Valid email address is required')
        .normalizeEmail(),
    
    handleValidationErrors
];

// =====================================================
// CONTACT FORM VALIDATION
// =====================================================
export const validateContactForm = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Valid email address is required')
        .normalizeEmail(),
    
    body('message')
        .notEmpty().withMessage('Message is required')
        .trim()
        .isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
    
    body('phone')
        .optional()
        .custom(value => {
            if (value && !validatePhoneNumber(value)) {
                throw new Error('Invalid Kenyan phone number format');
            }
            return true;
        }),
    
    handleValidationErrors
];

// =====================================================
// EXPORT ALL VALIDATION RULES
// =====================================================
export default {
    handleValidationErrors,
    validateCourse,
    validateCourseId,
    validateEnrollment,
    validatePayment,
    validateUser,
    validateLogin,
    validatePagination,
    validateUserRole,
    validateMpesaCallback,
    validateCheckoutRequestId,
    validateProgress,
    validatePasswordReset,
    validateForgotPassword,
    validateContactForm,
    validatePhoneNumber
};
