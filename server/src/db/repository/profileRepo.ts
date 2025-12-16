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
    return await this.collection.find({ $or: orConditions }).toArray();
  }
}
