const User = require("../Models/signupModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.signup = async (req, res) => {
    console.log("🔥 SIGNUP API HIT 🔥");
  console.log("BODY:", req.body);
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(409).json({ message: "User already exists" });
    }
    const saltrounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltrounds);

    await User.create({ name, email, phone, password: hashedPassword });

    res.status(201).json({ message: "Signup successful" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }

};

function generateAccessToken(id, name) {
  const secret = process.env.JWT_SECRET || 'replace_this_with_strong_secret';
  // token contains only the userId (do not include sensitive info)
  return jwt.sign({ userId: id }, secret, { expiresIn: '7d' });
}


exports.login = async (req, res) => {
    try{
      const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
        return res.status(401).json({ message: "User not found" });
    }
  
    const isMatched = await bcrypt.compare(password, user.password);
    if(!isMatched){
      return res.status(404).json({ message: "Incorrect password" });
    }
    
    // Return JWT token (frontend must send as `Authorization: Bearer <token>`)
    const token = generateAccessToken(user.id, user.name);
    res.status(200).json({ message: "Login successful", token });
    } catch(err){
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
};