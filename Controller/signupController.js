const User = require("../Models/signupModel");
const sequelize = require("../Utils/util");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");



exports.signup = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      console.log("🔥 SIGNUP API HIT 🔥");
      console.log("BODY:", req.body);
      
      const { name, email, phone, password } = req.body;

      if (!name || !email || !phone || !password) {
        await t.rollback();
        return res.status(400).json({ message: "All fields are required" });
      }

      const userExists = await User.findOne({ where: { email }, transaction: t });

      if (userExists) {
        await t.rollback();
        return res.status(409).json({ message: "User already exists" });
      }
      
      const saltrounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltrounds);

      await User.create({ name, email, phone, password: hashedPassword }, { transaction: t });

      await t.commit();
      res.status(201).json({ message: "Signup successful" });
    } catch (err) {
      await t.rollback();
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
};

function generateAccessToken(id, isPremium) {
  const secret = process.env.JWT_SECRET || 'd6d43a64dce88b8870a88bacedb429f6';
  // token contains userId and isPremium
  const token = jwt.sign({ userId: id, isPremium: isPremium }, secret, { expiresIn: '7d' });
  console.log('✅ Token generated for userId:', id, 'isPremium:', isPremium);
  console.log('✅ Token preview:', token.substring(0, 50) + '...');
  console.log('✅ Token expiry: 7 days');
  return token;
}


exports.login = async (req, res) => {
    try{
      const { email, password } = req.body;

      console.log('🔐 LOGIN REQUEST - Email:', email);

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({ message: "User not found" });
    }
  
    const isMatched = await bcrypt.compare(password, user.password);
    if(!isMatched){
      console.log('❌ Password mismatch for user:', email);
      return res.status(404).json({ message: "Incorrect password" });
    }
    
    console.log('✅ Password matched for user:', email);
    
    // Return JWT token (frontend must send as `Authorization: Bearer <token>`)
    const token = generateAccessToken(user.id, user.isPremium);
    console.log('✅ Login successful - token sent to client');
    res.status(200).json({ message: "Login successful", token });
    } catch(err){
      console.error('❌ Login error:', err);
      return res.status(500).json({ message: "Internal server error" });
    }
};