const Order = require("../Models/orderModel");
const Signup = require("../Models/signupModel");


function generateOrderId() {
    return `TESTING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create payment order - immediately mark premium as successful for local/demo use
exports.createPaymentOrder = async (req, res) => {
    try {
        const { amount, premiumTier } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!amount) return res.status(400).json({ error: 'Amount is required' });

        const user = await Signup.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const orderId = generateOrderId();
        const selectedTier = parseInt(premiumTier, 10) || 1;

        const orderData = {
            orderId: orderId,
            userId: userId,
            amount: parseFloat(amount),
            status: 'SUCCESSFUL',
            premiumTier: selectedTier
        };

        await Order.create(orderData);

        user.isPremium = true;
        user.premiumTier = Math.max(user.premiumTier || 0, selectedTier);
        await user.save();

        return res.status(201).json({
            orderId,
            paymentSessionId: orderId,
            amount,
            premiumTier: selectedTier,
            status: 'SUCCESSFUL',
            message: 'Premium activated successfully'
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Verify payment - immediately mark the order as successful for local/demo use
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

        order.status = 'SUCCESSFUL';
        await order.save();

        const user = await Signup.findById(userId);
        if (user) {
            user.isPremium = true;
            user.premiumTier = Math.max(user.premiumTier || 0, order.premiumTier || 1);
            await user.save();
        }

        return res.status(200).json({
            orderId: order.orderId,
            status: 'SUCCESSFUL',
            amount: order.amount,
            message: 'Payment verified successfully'
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!orderId || !status) return res.status(400).json({ error: 'Order ID and status required' });
        if (!['PENDING', 'SUCCESSFUL', 'FAILED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

        order.status = status;
        await order.save();

        if (status === 'SUCCESSFUL') {
            const user = await Signup.findById(userId);
            if (user) {
                user.isPremium = true;
                user.premiumTier = Math.max(user.premiumTier || 0, order.premiumTier || 1);
                await user.save();
            }
        }

        return res.status(200).json({ message: 'Payment status updated', orderId: order.orderId, status });

    } catch (error) {

        return res.status(500).json({ error: error.message });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get user premium status
exports.getPremiumStatus = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await Signup.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isPremium = Boolean(user.isPremium || req.user.isPremium || req.user.premiumTier > 0);
        const premiumTier = user.premiumTier || req.user.premiumTier || 0;

        return res.status(200).json({ isPremium, premiumTier });
    } catch (error) {
        console.error("Get Premium Status Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};