const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Connect DB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error(err));

// Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const MealSchema = new mongoose.Schema({
  lunch: { type: String, enum: ['none', 'half', 'full'], default: 'none' },
  dinner: { type: String, enum: ['none', 'half', 'full'], default: 'none' }
}, { _id: false });

const PlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStart: { type: String, required: true }, // ISO date of Monday
  days: {
    mon: { type: MealSchema, default: () => ({}) },
    tue: { type: MealSchema, default: () => ({}) },
    wed: { type: MealSchema, default: () => ({}) },
    thu: { type: MealSchema, default: () => ({}) },
    fri: { type: MealSchema, default: () => ({}) },
    sat: { type: MealSchema, default: () => ({}) }
  }
}, { timestamps: true });
const Plan = mongoose.model('Plan', PlanSchema);

// Pricing
const HALF_PRICE = 50;
const FULL_PRICE = 65;

// Helpers
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function genToken(user) {
  return jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function calcTotalForPlan(plan) {
  const days = plan.days || {};
  let total = 0;
  
  // Calculate for each day's lunch and dinner
  for (const day of Object.values(days)) {
    // Add lunch cost
    if (day.lunch === 'half') total += HALF_PRICE;
    else if (day.lunch === 'full') total += FULL_PRICE;
    
    // Add dinner cost
    if (day.dinner === 'half') total += HALF_PRICE;
    else if (day.dinner === 'full') total += FULL_PRICE;
  }
  
  return total;
}

// Middleware auth
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing auth' });
  const token = authHeader.split(' ')[1];
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'missing fields' });
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    const token = genToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'missing' });
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'invalid' });
  const token = genToken(user);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

// Get all users (small list) - for showing friends
app.get('/api/users', auth, async (req, res) => {
  const users = await User.find({}, 'name email');
  res.json(users);
});

// Get plans for a week (all users)
app.get('/api/plans/week/:weekStart', auth, async (req, res) => {
  const { weekStart } = req.params;
  const plans = await Plan.find({ weekStart }).populate('user', 'name email');
  const enhanced = await Promise.all(plans.map(async p => ({
    id: p._id,
    user: { id: p.user._id, name: p.user.name, email: p.user.email },
    days: p.days,
    total: await calcTotalForPlan(p)
  })));
  res.json(enhanced);
});

// Get my plan and total for week
app.get('/api/plans/mine/:weekStart', auth, async (req, res) => {
  const { weekStart } = req.params;
  const plan = await Plan.findOne({ weekStart, user: req.user.id });
  if (!plan) return res.json({ plan: null, total: 0 });
  const total = await calcTotalForPlan(plan);
  res.json({ plan, total });
});

// Create or update my plan for a week
app.post('/api/plans', auth, async (req, res) => {
  const { weekStart, days } = req.body;
  if (!weekStart || !days) return res.status(400).json({ error: 'missing' });
  const allowed = ['none','half','full'];
  const keys = ['mon','tue','wed','thu','fri','sat'];
  
  // Ensure days object exists with proper structure
  const normalizedDays = {};
  for (const k of keys) {
    normalizedDays[k] = {
      lunch: (days[k]?.lunch || 'none'),
      dinner: (days[k]?.dinner || 'none')
    };
    
    // Validate values
    if (!allowed.includes(normalizedDays[k].lunch)) {
      return res.status(400).json({ error: `invalid lunch value for ${k}` });
    }
    if (!allowed.includes(normalizedDays[k].dinner)) {
      return res.status(400).json({ error: `invalid dinner value for ${k}` });
    }
  }
  
  // Replace the days object with normalized version
  req.body.days = normalizedDays;
  
  try {
    let plan = await Plan.findOne({ weekStart, user: req.user.id });
    if (plan) {
      plan.days = days;
      await plan.save();
    } else {
      plan = await Plan.create({ weekStart, user: req.user.id, days });
    }
    const total = await calcTotalForPlan(plan);
    res.json({ plan, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// Optional: Admin endpoint to compute everyone's bill summary for a week
app.get('/api/plans/summary/:weekStart', auth, async (req, res) => {
  const { weekStart } = req.params;
  const plans = await Plan.find({ weekStart }).populate('user', 'name');
  const result = [];
  for (const p of plans) {
    result.push({ user: p.user.name, total: await calcTotalForPlan(p), days: p.days });
  }
  res.json(result);
});


app.listen(PORT, () => console.log(`Server running on ${PORT}`));
