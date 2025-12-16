import { Collection } from "mongodb";
import { mongoClient } from "../mongoClient";
import { config } from "../../index";

export class ProfileRepo {
  private collection: Collection;
  constructor() {
    this.collection = mongoClient.getDb().collection(config.profile.collection);
  }

  async getProfileByIdentifier(identifer: string[], value: string) {
    // Ensure value is a valid string for regex
    if (!value || typeof value !== "string") {
      return [];
    }

    const orConditions = identifer.map((field) => ({
      [field]: { $regex: value, $options: "i" },
    }));

    const projection: Record<string, number> = {};
    config.profile.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection
      .find({ $or: orConditions }, { projection })
      .toArray();
  }

  /**
   * Get a single profile by ID
   */
  async getProfileById(id: string) {
    const projection: Record<string, number> = {};
    config.profile.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.findOne({ id }, { projection });
  }

  /**
   * Generic filter method that accepts any field-value pairs
   * Validates fields against configured projection
   * @param filters Object with field-value pairs for filtering
   */
  async filter(filters: Record<string, any>) {
    // Validate that all filter fields are in the projection
    const allowedFields = config.profile.projection;
    const filterFields = Object.keys(filters);

    const invalidFields = filterFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      throw new Error(
        `Invalid filter fields: ${invalidFields.join(
          ", "
        )}. Allowed fields: ${allowedFields.join(", ")}`
      );
    }

    // Build MongoDB filter from the provided filters
    const mongoFilter: any = {};

    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        continue; // Skip null/undefined values
      }

      // Handle different value types appropriately
      if (typeof value === "string") {
        // String values: case-insensitive regex match
        mongoFilter[field] = { $regex: value, $options: "i" };
      } else if (typeof value === "number" || typeof value === "boolean") {
        // Number and boolean values: exact match
        mongoFilter[field] = value;
      } else if (Array.isArray(value)) {
        // Array values: match any of the values ($in)
        mongoFilter[field] = { $in: value };
      } else if (typeof value === "object") {
        // Object values: assume it's a MongoDB operator (e.g., {$gte: 10, $lte: 100})
        mongoFilter[field] = value;
      } else {
        // Default: exact match
        mongoFilter[field] = value;
      }
    }

    const projection: Record<string, number> = {};
    config.profile.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.find(mongoFilter, { projection }).toArray();
  }
}
