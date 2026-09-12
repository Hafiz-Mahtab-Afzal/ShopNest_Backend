import { Request, Response } from 'express';
import User from '../models/user.model'; // apna sahi path laga len
import Order from '../models/order.model'; // apna sahi path laga len
import sanitizeHtml from 'sanitize-html'; // 🛡️ Stored XSS Protection (Point 6) package import kiya consistency ke liye

// ✅ req.user extend karo — Express mein user hota nahi by default
interface AuthRequest extends Request {
  user?: { id: string; role?: string }
}

// ----------------------------------------------------------------
// MONTH NAMES (chart mein "Jan", "Feb"... isi tarteeb se chahiye)
// ----------------------------------------------------------------
const monthNames = [
  'Jan', 'Feb', 'Mar', 'April', 'May', 'June',
  'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ----------------------------------------------------------------
// GET MONTHLY DASHBOARD STATS
// Yeh ek hi API hai jo TotalUsers aur TotalSales dono month-wise
// (current year ke hisab se, Jan se Dec) return karti hai.
// ----------------------------------------------------------------
export const getMonthlyDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // 🛡️ [SECURED - POINT 2 (BROKEN ACCESS CONTROL FIX)]:
    // Dashboard stats sirf admin dekh sakta hai. Agar user login nahi hai ya uska role admin nahi hai, toh request block.
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access: Admin dashboard stats only!" });
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const startOfNextYear = new Date(`${currentYear + 1}-01-01T00:00:00.000Z`);

    const usersAggregation = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lt: startOfNextYear },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalUsers: { $sum: 1 },
        },
      },
    ]);

    const ordersAggregation = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lt: startOfNextYear },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalSales: { $sum: '$items.totalprice' },
        },
      },
    ]);

    const finalData = monthNames.map((monthName, index) => {
      const monthNumber = index + 1;
      const userMatch = usersAggregation.find((u) => u._id === monthNumber);
      const orderMatch = ordersAggregation.find((o) => o._id === monthNumber);

      return {
        month: monthName,
        TotalUsers: userMatch ? userMatch.totalUsers : 0,
        TotalSales: orderMatch ? orderMatch.totalSales : 0,
      };
    });

    // ✅ Console se check karo pehle
    console.log("Monthly Stats:", JSON.stringify(finalData, null, 2));

    return res.status(200).json({ success: true, data: finalData });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};