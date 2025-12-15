import { Db, MongoClient } from "mongodb";
import { config } from "../index.js";

export class mongoDBClient{
    private client: MongoClient | null = null
    private db: Db | null = null

    async connect(){
        this.client = new MongoClient(config.database.uri)
        await this.client.connect()
        this.db = this.client.db(config.database.name)
        console.error("MongoDB connected")
    }
} 


export const  mongoClient = new mongoDBClient() 