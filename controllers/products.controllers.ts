import Product from '../models/product.model';
import { Request, Response } from 'express';
import { error, warning } from '../utils/messages';
import Category from '../models/category.model';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import redisconnect from '../database/redisconnect';

const productQuerySchema = z.object({
  category: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minRating: z.string().optional(),
  title: z.string().optional(),
  brand: z.string().optional(),
  sort: z.string().optional(),
  page: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

export interface ProductType {
  title: string;
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sort: string;
  page: string;
  cursor?: string;
  limit: string;
}

interface ProductQuery {
  title?: string;
  category?: string;
  brand?: string;
  price?: {
    $gte?: number;
    $lte?: number;
  };
  rating?: {
    $gte?: number;
  };
  $text?: {
    $search: string;
  };
  _id?: { $gt: string };
}

const getproducts = async (req: Request, res: Response) => {
  try {
    const validation = productQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return warning('Invalid search filter format', res);
    }

    const { category, minPrice, maxPrice, minRating, title, brand, sort, cursor, page, limit } =
      req.query as unknown as ProductType;

    const cacheKey = `products:${JSON.stringify(req.query)}`;

    const cached = await redisconnect.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const queryObject: ProductQuery = {};

    if (category) {
      queryObject.category = category;
    }
    if (brand) {
      queryObject.brand = brand;
    }
    if (minPrice || maxPrice) {
      queryObject.price = {};
      if (minPrice) queryObject.price.$gte = Number(minPrice);
      if (maxPrice) queryObject.price.$lte = Number(maxPrice);
    }
    if (minRating) {
      queryObject.rating = { $gte: Number(minRating) };
    }
    if (title) {
      queryObject.$text = { $search: title };
    }

    let sortfix = '-createdAt';
    if (sort) {
      sortfix = sort.split(',').join(' ');
    }

    const limitNumber = Number(limit) || 12;

    // 🔵 CURSOR MODE — Landing page / Load More ke liye
    if (cursor || (!page && !cursor)) {
      const cursorQuery: ProductQuery = { ...queryObject };
      if (cursor) {
        cursorQuery._id = { $gt: cursor };
      }

      const total = await Product.countDocuments(queryObject);

      if (total === 0) {
        const emptyResult = {
          display: 'No Products',
          products: [],
          total: 0,
          nextCursor: null,
        };
        await redisconnect.set(cacheKey, JSON.stringify(emptyResult), 'EX', 3600);
        return res.json(emptyResult);
      }

      const products = await Product.find(cursorQuery)
        .sort({ _id: 1 })
        .limit(limitNumber)
        .lean();

      const nextCursor = products.length > 0 ? products[products.length - 1]._id : null;

      const result = {
        total,
        products,
        nextCursor,
      };

      await redisconnect.set(cacheKey, JSON.stringify(result), 'EX', 3600);
      return res.json(result);
    }

    // 🟢 OFFSET MODE — Search Results page (numbered pagination) ke liye
    const pageNumber = Number(page) || 1;
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Product.countDocuments(queryObject);

    if (total === 0) {
      const emptyResult = {
        display: 'No Products',
        products: [],
        total: 0,
        totalPages: 0,
        currentPage: pageNumber,
      };
      await redisconnect.set(cacheKey, JSON.stringify(emptyResult), 'EX', 3600);
      return res.json(emptyResult);
    }

    const products = await Product.find(queryObject)
      .sort(sortfix)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    const result = {
      total,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      products,
    };

    await redisconnect.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    res.json(result);
  } catch (err: any) {
    return res.json({
      error: err.message,
    });
  }
};

const getproduct = async (req: Request, res: Response) => {
  try {
    const id: string | string[] = req.params.id;

    const cached = await redisconnect.get(`product:${id}`)
    if (cached) {
     return res.json(JSON.parse(cached))
    }

    const lock = await redisconnect.set(
    `lock:product:${id}`, '1',
    'EX', 5, 'NX'
    )

    if (!lock) {
      await new Promise(resolve => setTimeout(resolve, 200));

      const retryCache = await redisconnect.get(`product:${id}`)
      if (retryCache) {
        return res.json(JSON.parse(retryCache))
      }
    }

    const singleproduct = await Product.findById(id).lean();
    if (!singleproduct) {
      return res.json({
        Message: `product not found of this id ${singleproduct}`,
      });
    }

    await redisconnect.set(`product:${id}`, JSON.stringify(singleproduct), 'EX', 21600);

    await redisconnect.del(`lock:product:${id}`);

    {
      res.json({
        singleproduct,
      });
    }
  } catch (err: any) {
    res.json({
      error: err.message,
    });
  }
};

interface adddata extends Omit<ProductType, 'sort'> {
  subtitle: string,
  discription: string,
  price:string,
  images: string
}

const addproduct = async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access: Admin only" });
    }

    const { title, subtitle, category, discription, brand, price } = req.body as adddata
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return error('At least one image is required', res);
    }

    if (!title || !subtitle || !category || !discription || !brand || !price) {
      return res.json({
        error: 'All fields are required',
      });
    }

    const cleanTitle = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} });
    const cleanSubtitle = sanitizeHtml(subtitle, { allowedTags: [], allowedAttributes: {} });
    const cleanCategory = sanitizeHtml(category, { allowedTags: [], allowedAttributes: {} });
    const cleanDescription = sanitizeHtml(discription, { allowedTags: [], allowedAttributes: {} });
    const cleanBrand = sanitizeHtml(brand, { allowedTags: [], allowedAttributes: {} });

    const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
    const imagePaths = files.map((file) => `${BASE_URL}/uploads/${file.filename}`);

    await new Product({
      title: cleanTitle,
      subtitle: cleanSubtitle,
      category: cleanCategory,
      description: cleanDescription,
      brand: cleanBrand,
      price,
      images: imagePaths,
    }).save()

    res.json({
      success: 'product inserted successfully',
    });
  } catch (err: any) {
    res.json({
      error: err.message,
    });
  }
};

const addcategory = async (req: Request,res: Response) => {
  try{
        if ((req as any).user?.role !== 'admin') {
          return res.status(403).json({ error: "Unauthorized access: Admin only" });
        }

        const category = req.body.category as string
        if(!category ){
         return res.json({
            error:"Category required"
          })
        }

        const cleanCategoryName = sanitizeHtml(category, { allowedTags: [], allowedAttributes: {} });
        const category_name = cleanCategoryName

        await new Category({category_name}).save()

      res.json({
        success:"category inserted successfully"
      })
  }
  catch(err: any){
    res.json({
      error:err.message
    })
  }
}

const updateproduct = async (req: Request, res: Response) => {
  try {

    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access: Admin only" });
    }

    const id = req.params.id as string
    const products = req.body as adddata

    if (products.title) products.title = sanitizeHtml(products.title, { allowedTags: [], allowedAttributes: {} });
    if (products.subtitle) products.subtitle = sanitizeHtml(products.subtitle, { allowedTags: [], allowedAttributes: {} });
    if (products.category) products.category = sanitizeHtml(products.category, { allowedTags: [], allowedAttributes: {} });
    if (products.discription) products.discription = sanitizeHtml(products.discription, { allowedTags: [], allowedAttributes: {} });
    if (products.brand) products.brand = sanitizeHtml(products.brand, { allowedTags: [], allowedAttributes: {} });

    const updatedProduct = await Product.findByIdAndUpdate(id, products, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    await redisconnect.set(`product:${id}`, JSON.stringify(updatedProduct), 'EX', 21600);

    res.json({
      success: 'product updated successfully',
      product: updatedProduct,
    });
  } catch (err: any) {
    res.json({
      error: err.message,
    });
  }
};

const deleteproduct = async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access: Admin only" });
    }

    const id = req.params.id as string
    await Product.findByIdAndDelete(id);
    res.json({
      success: 'product deleted successfully',
    });
  } catch (err: any) {
    res.json({
      error: err.message,
    });
  }
};

const getcategories = async (req: Request,res: Response) => {
  const categories = await Category.find()
  const length = categories.length

  try{
       if(length==0){
          return res.json({
              display:"no category"
          })
       }
       {
        res.json({
          display:`No category found please add one`,
          categories:categories
        })
       }
  }
  catch(err: any){
    return res.json({
    error:err.message
  })
  }
}

const admin = async (req: Request,res: Response) => {
   try {
    res.json({
      Success: 'Successfull',
    });

   }
   catch (err: any) {
    res.json({
      error: err.message,
    });
  }
}

export { getproducts, getproduct, addproduct, addcategory, updateproduct,deleteproduct, getcategories, admin };