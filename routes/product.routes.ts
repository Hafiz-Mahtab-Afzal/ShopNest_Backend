import express from 'express';
import * as pc from '../controllers/products.controllers';
import upload from '../middlewares/multer';
import { checkrole, requriedLoggedIn } from '../middlewares/authMiddle';

const products = express.Router();

// --- 1. ADMIN DASHBOARD ROUTE (Sirf Admin Dekh Sake) ---
products.route("/admin")
        .get(requriedLoggedIn, checkrole, pc.admin);

// --- 2. MAIN PRODUCT ROUTES ---
products.route("/")
        .get(pc.getproducts) // ✅ Public: Products har koi dekh sakta hai (Point 1 Zod secured)
        .post(requriedLoggedIn, checkrole, upload.array("images", 5), pc.addproduct) // ✅ Secure: Sirf Admin add karega (Point 2 Secured)

// --- 3. CATEGORY ROUTES ---
products.route("/category")
        .get(pc.getcategories) // 🛡️ [FIXED]: Ab categories ko public kar diya hai taake normal users bhi browse kar sakein!
        .post(requriedLoggedIn, checkrole, pc.addcategory) // ✅ Secure: Nayi category sirf Admin create karega

// --- 4. SPECIFIC PRODUCT ROUTES (ID ke sath) ---
products.route("/:id")
         .get(pc.getproduct) // ✅ Public: Single product description page sab ke liye open hai
         .put(requriedLoggedIn, checkrole, pc.updateproduct) // ✅ Secure: Product update sirf Admin (Point 2 Secured)
         .delete(requriedLoggedIn, checkrole, pc.deleteproduct) // ✅ Secure: Product delete sirf Admin (Point 2 Secured)

export default products;