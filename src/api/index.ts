import { db } from "ponder:api";
import * as schema from "ponder:schema";
import { client } from "ponder";
import { Hono } from "hono";

const app = new Hono();

// SQL over HTTP — @ponder/client connects here for type-safe queries
app.use("/sql/*", client({ db, schema }));

export default app;
