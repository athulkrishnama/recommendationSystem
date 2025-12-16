import { Collection } from "mongodb";
import { mongoClient } from "../mongoClient";
import { config } from "../../index";

export class ProfileRepo {
  private collection: Collection;
  constructor() {
    this.collection = mongoClient.getDb().collection(config.profile.collection);
  }

  async getProfileByIdentifier(identifer: string[], value: string) {
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

  async getProfileById(id: string) {
    const projection: Record<string, number> = {};
    config.profile.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.findOne({ id }, { projection });
  }

  async filter(filters: Record<string, any>) {
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
    config.profile.projection.forEach((field) => {
      projection[field] = 1;
    });

    return await this.collection.find(mongoFilter, { projection }).toArray();
  }
}
