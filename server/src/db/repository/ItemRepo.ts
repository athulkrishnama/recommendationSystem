import { Collection } from "mongodb";
import { mongoClient } from "../mongoClient";
import { config } from "../../index";

export class ItemRepo {
  private collection: Collection;

  constructor() {
    if (!config.item) {
      throw new Error("Item configuration is not defined");
    }
    this.collection = mongoClient.getDb().collection(config.item.collection);
  }

  async getAllItems() {
    if (!config.item) {
      return [];
    }

    const projection: Record<string, number> = {};
    config.item.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.find({}, { projection }).toArray();
  }

  async getItemById(id: string) {
    if (!config.item) {
      return null;
    }

    const projection: Record<string, number> = {};
    config.item.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.findOne({ id }, { projection });
  }

  async filter(filters: Record<string, any>) {
    if (!config.item) {
      return [];
    }

    const allowedFields = config.item.projection;
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

    const mongoFilter: any = {};

    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === "string") {
        mongoFilter[field] = { $regex: value, $options: "i" };
      } else if (typeof value === "number" || typeof value === "boolean") {
        mongoFilter[field] = value;
      } else if (Array.isArray(value)) {
        mongoFilter[field] = { $in: value };
      } else if (typeof value === "object") {
        mongoFilter[field] = value;
      } else {
        mongoFilter[field] = value;
      }
    }

    const projection: Record<string, number> = {};
    config.item.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.find(mongoFilter, { projection }).toArray();
  }
}
