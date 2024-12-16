const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Configure CORS for production
app.use(cors({
  origin: ['https://urbanebolt.com', 'https://www.urbanebolt.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Your existing route handlers with error handling
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, service, message } = req.body;
    if (!name || !email || !service || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
    
    await transporter.sendMail({
      from: '"Urbanebolt Support" <support@urbanbolt.in>',
      to: 'support@urbanbolt.in',
      subject: `New Contact Form Submission - ${service}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    });

    await transporter.sendMail({
      from: '"Urbanebolt Support" <support@urbanbolt.in>',
      to: email,
      subject: 'Thank you for contacting Urbanebolt',
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message regarding ${service}. Our team will review your inquiry and get back to you shortly.</p>
        <p>Best regards,<br>The Urbanebolt Team</p>
      `
    });

    res.json({ 
      success: true, 
      message: 'Your message has been sent successfully. We will get back to you soon.' 
    });
    } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      message: 'There was a problem sending your message. Please try again later.'
    });
  }
});

app.post('/api/careers-application', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Missing resume file',
        message: 'Please attach a resume file'
      });
    }

    const { department, name, country, pinCode, state, city, email, mobile } = req.body;
    
    if (!department || !name || !email || !mobile) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please fill in all required fields'
      });
    }

    await transporter.sendMail({
      from: '"Urbanebolt Careers" <support@urbanbolt.in>',
      to: 'careers@urbanebolt.com',
      subject: `New Job Application - ${department}`,
      html: `
        <h2>New Job Application</h2>
        <p><strong>Department:</strong> ${department}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Location:</strong> ${city}, ${state}, ${country} - ${pinCode}</p>
      `,
      attachments: req.file ? [
        {
          filename: req.file.originalname,
          content: req.file.buffer
        }
      ] : []
    });

    await transporter.sendMail({
      from: '"Urbanebolt Careers" <support@urbanbolt.in>',
      to: email,
      subject: 'Thank you for your application - Urbanebolt',
      html: `
        <h2>Thank you for applying!</h2>
        <p>Dear ${name},</p>
        <p>We have received your application for the ${department} position at Urbanebolt. 
        Our HR team will review your application and get back to you if your profile matches our requirements.</p>
        <p>Application Details:</p>
        <ul>
          <li>Position: ${department}</li>
          <li>Name: ${name}</li>
          <li>Email: ${email}</li>
          <li>Location: ${city}, ${state}</li>
        </ul>
        <p>Best regards,<br>The Urbanebolt HR Team</p>
      `
    });

    res.json({ 
      success: true, 
      message: 'Your application has been submitted successfully.' 
    });
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    console.error('Application submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit application',
      message: 'There was a problem submitting your application. Please try again later.'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 