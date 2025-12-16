import { Collection } from "mongodb";
import { mongoClient } from "../mongoClient";
import { config } from "../../index";

export class ProductRepo {
  private collection: Collection;

  constructor() {
    if (!config.product) {
      throw new Error("Product configuration is not defined");
    }
    this.collection = mongoClient.getDb().collection(config.product.collection);
  }

  /**
   * Get all products with configured projection
   */
  async getAllProducts() {
    if (!config.product) {
      return [];
    }

    const projection: Record<string, number> = {};
    config.product.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.find({}, { projection }).toArray();
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string) {
    if (!config.product) {
      return null;
    }

    const projection: Record<string, number> = {};
    config.product.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.findOne({ id }, { projection });
  }

  /**
   * Filter products by dynamic criteria
   * @param criteria Object with optional fields: category, minPrice, maxPrice, tags, inStock
   */
  async filterProducts(criteria: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    inStock?: boolean;
  }) {
    if (!config.product) {
      return [];
    }

    const filter: any = {};

    // Category filter (case-insensitive)
    if (criteria.category) {
      filter.category = { $regex: criteria.category, $options: "i" };
    }

    // Price range filter
    if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
      filter.price = {};
      if (criteria.minPrice !== undefined) {
        filter.price.$gte = criteria.minPrice;
      }
      if (criteria.maxPrice !== undefined) {
        filter.price.$lte = criteria.maxPrice;
      }
    }

    // Tags filter (product must have at least one of the specified tags)
    if (criteria.tags && criteria.tags.length > 0) {
      filter.tags = { $in: criteria.tags };
    }

    // Stock availability filter
    if (criteria.inStock !== undefined) {
      if (criteria.inStock) {
        filter.stock = { $gt: 0 };
      } else {
        filter.stock = { $lte: 0 };
      }
    }

    const projection: Record<string, number> = {};
    config.product.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.find(filter, { projection }).toArray();
  }
}
