require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');


const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(helmet());

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

require('dotenv').config();
console.log('MONGO_URI:', process.env.MONGO_URI);


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB error:', err));


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB error:', err));

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ===== Models =====
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    telephone: String,
    password: String,
    securityQuestion1: String,
    securityAnswer1: String,
    securityQuestion2: String,
    securityAnswer2: String,
    role: { type: String, enum: ['lifeguard', 'skipatrol'], default: 'lifeguard' },
    twoFactorCode: String
}));

const ChecklistItem = mongoose.model('ChecklistItem', new mongoose.Schema({
    name: String,
    completed: { type: Boolean, default: false },
    initials: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}));

// ===== Utilities =====
const sendEmail = async (to, subject, text) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
};

// ===== Middleware =====
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ===== Routes =====
// Signup
app.post('/signup', async (req, res) => {
    const { name, email, password, telephone, securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = new User({ name, email, telephone, password: hashedPassword, securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2, role });
        await user.save();
        res.json({ message: 'User registered' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login with 2FA
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactorCode = code;
    await user.save();
    await sendEmail(user.email, 'Your 2FA Code', `Code: ${code}`);
    res.json({ message: '2FA code sent' });
});

// Verify 2FA
app.post('/verify-2fa', async (req, res) => {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (user.twoFactorCode !== code) return res.status(400).json({ error: 'Invalid 2FA code' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'Lax' }).json({ message: 'Login successful' });
});

// Logout
app.post('/logout', (req, res) => {
    res.clearCookie('token').json({ message: 'Logged out' });
});

// Forgot Password
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ securityQuestion1: user.securityQuestion1, securityQuestion2: user.securityQuestion2 });
});

// Reset Password
app.post('/reset-password', async (req, res) => {
    const { email, answer1, answer2, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (user.securityAnswer1 !== answer1 || user.securityAnswer2 !== answer2) return res.status(400).json({ error: 'Incorrect answers' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password reset successful' });
});

// Checklist CRUD
app.get('/items', authenticateToken, async (req, res) => {
    const items = await ChecklistItem.find({ userId: req.user.id });
    res.json(items);
});

app.post('/items', authenticateToken, async (req, res) => {
    const item = new ChecklistItem({ name: req.body.name, userId: req.user.id });
    await item.save();
    res.json(item);
});

app.put('/items/:id', authenticateToken, async (req, res) => {
    const item = await ChecklistItem.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
    res.json(item);
});

app.delete('/items/:id', authenticateToken, async (req, res) => {
    await ChecklistItem.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Item deleted' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
