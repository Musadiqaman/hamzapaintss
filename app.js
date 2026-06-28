import express from "express";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import moment from "moment-timezone";
import dns from "dns";

// DB Connection Config Import
import connectDB from "./config/db.js";

// Load .env Configuration
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================================================
// 🔌 DATABASE INITIATION
// =======================================================
connectDB();

// =======================================================
// 🌐 RUNTIME DNS FIX (ONLY FOR LOCAL DEVELOPMENT)
// =======================================================
if (!isProduction) {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const atlasURI = process.env.MONGO_URI;
let atlasClient = null;
let isAtlasOnline = isProduction;

const MAX_RETRIES = 5;
let retryCount = 0;
let retryTimeout = null;

// =======================================================
// 🎨 CUSTOM PROGRESS BAR
// =======================================================
function createProgressBar(total, label = "Syncing") {
  let current = 0;
  const BAR_WIDTH = 35;

  function render() {
    const percent = total === 0 ? 100 : Math.floor((current / total) * 100);
    const filled = Math.floor((current / (total || 1)) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;

    const green  = "\x1b[32m";
    const yellow = "\x1b[33m";
    const gray   = "\x1b[90m";
    const reset  = "\x1b[0m";
    const bold   = "\x1b[1m";

    const bar =
      green + "█".repeat(filled) +
      gray  + "░".repeat(empty)  + reset;

    const percentStr =
      percent === 100
        ? green + bold + "100%" + reset
        : yellow + percent + "%" + reset;

    process.stdout.write(
      `\r  ▕${bar}▏ ${percentStr}  ${gray}${label}: ${current}/${total}${reset}   `
    );
  }

  return {
    tick(n = 1) {
      current = Math.min(current + n, total);
      render();
    },
    complete() {
      current = total;
      render();
      process.stdout.write("\n");
    },
  };
}

// =======================================================
// 🔁 GLOBAL MONGOOSE PLUGIN
// =======================================================
mongoose.plugin((schema) => {
  schema.set("bufferCommands", false);

  if (!schema.path("syncedToAtlas")) {
    schema.add({
      syncedToAtlas: { type: Boolean, default: false, index: true },
    });
  }

  // ✅ save() ke liye alag pre hook
  schema.pre("save", function () {
    if (this.isNew) return; // naya doc — default false already hai
    this.syncedToAtlas = false; // existing doc update — false karo
  });

  // ✅ update operations ke liye alag pre hook
  schema.pre(
    ["updateOne", "findByIdAndUpdate", "findOneAndUpdate", "updateMany"],
    function () {
      const update = this.getUpdate();
      if (!update) return;

      const hasOtherSet = Object.keys(update.$set || {}).some(k => k !== "syncedToAtlas");
      const hasOtherOps = ["$pull", "$push", "$unset", "$inc"].some(op => update[op]);
      const hasTopLevel = Object.keys(update).some(k => !k.startsWith("$") && k !== "syncedToAtlas");

      if (!hasOtherSet && !hasOtherOps && !hasTopLevel) return;

      if (!update.$set) update.$set = {};
      update.$set.syncedToAtlas = false;
    }
  );
});

// =======================================================
// 📂 MODELS IMPORT
// =======================================================
import Admin from "./models/Admin.js";
import Agent from "./models/Agent.js";
import AgentItem from "./models/AgentItem.js";
import BlockedIP from "./models/BlockedIP.js";
import Customer from "./models/Customer.js";
import CustomerItem from "./models/CustomerItem.js";
import CustomerPaymentHistory from "./models/CustomerPaymentHistory.js";
import Guest from "./models/Guest.js";
import ItemDefinition from "./models/ItemDefinition.js";
import PrintSale from "./models/PrintSale.js";
import Product from "./models/Product.js";
import RefundProductHistory from "./models/RefundProductHistory.js";
import RefundSaleHistory from "./models/RefundSaleHistory.js";
import Sale from "./models/Sale.js";
import AgentPaymentHistory from "./models/AgentPaymentHistory.js";
import PendingDelete from "./models/PendingDelete.js";
import PrintProduct from "./models/PrintProduct.js";
import Company from "./models/Company.js";
import CompanayItem from "./models/CompanayItem.js";
import CompanyPaymentHistory from "./models/CompanyPaymentHistory.js";

// Routes Import
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import dynamicRoutes from "./routes/dynamicRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import guestRoutes from "./routes/guestRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";

// Middlewares Import
import { isLoggedIn } from "./middleware/isLoggedIn.js";
import { allowRoles } from "./middleware/allowRoles.js";


// =======================================================
// 🌐 INTERNET CHECK
// =======================================================
async function isInternetAvailable() {
  return new Promise((resolve) => {
    dns.lookup("google.com", (err) => resolve(!err));
  });
}


// =======================================================
// 🔁 ATLAS CONNECTION — Exponential Backoff + Auto Retry
// =======================================================
async function connectToAtlasNative() {
  if (isProduction || isAtlasOnline) return;
  if (!atlasURI) {
    console.log("⚠️  Sync Engine: MONGO_URI missing. Background sync disabled.");
    return;
  }

  const hasInternet = await isInternetAvailable();
  if (!hasInternet) {
    console.log("📡 Internet nahi — 1 minute mein dobara check karega...");
    retryTimeout = setTimeout(connectToAtlasNative, 60000);
    return;
  }

  try {
    atlasClient = new MongoClient(atlasURI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      heartbeatFrequencyMS: 5000,
      family: 4,
    });

    await atlasClient.connect();

    atlasClient.on("close", () => {
      if (isAtlasOnline) {
        isAtlasOnline = false;
        atlasClient = null;
        console.log("\n⚠️  Atlas connection lost. Retry mein dobara connect hoga...");
        retryTimeout = setTimeout(connectToAtlasNative, 60000);
      }
    });

    isAtlasOnline = true;
    retryCount = 0;
    console.log("\n☁️  \x1b[32m\x1b[1mSUCCESS:\x1b[0m Atlas Cloud Connected!\n");

    await syncMissingDataToAtlas();

  } catch (err) {
    isAtlasOnline = false;
    atlasClient = null;
    retryCount++;

    const delay = Math.min(30000 * Math.pow(2, retryCount - 1), 10 * 60 * 1000);
    const delayMin = Math.round((delay / 1000 / 60) * 10) / 10;

    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️  Atlas fail. Retry ${retryCount}/${MAX_RETRIES} — ${delayMin} min mein dobara.`);
      retryTimeout = setTimeout(connectToAtlasNative, delay);
    } else {
      console.log(`🔴 Atlas ${MAX_RETRIES} baar fail. Har 10 min mein check karta rahega...`);
      retryCount = 0;
      retryTimeout = setTimeout(connectToAtlasNative, 10 * 60 * 1000);
    }
  }
}


if (!isProduction) {
  setImmediate(connectToAtlasNative);
}


// =======================================================
// 📤 BATCH PUSH HELPER
// =======================================================
async function pushBatchToAtlas(atlasDb, collectionName, batch) {
  const bulkOps = batch.map((doc) => {
    const { syncedToAtlas, ...cleanDoc } = doc;
    return {
      replaceOne: {
        filter: { _id: doc._id },
        replacement: cleanDoc,
        upsert: true,
      },
    };
  });
  await atlasDb.collection(collectionName).bulkWrite(bulkOps);
}


// =======================================================
// 🔄 MAIN SYNC FUNCTION — CURSOR BASED (1 LAKH SAFE)
// =======================================================
async function syncMissingDataToAtlas() {
  if (isProduction || !isAtlasOnline || !atlasClient) return;

  try {
    const atlasDb = atlasClient.db();
    const modelNames = mongoose.modelNames();

    // =============================================
    // STEP 1 — PENDING DELETES PEHLE PROCESS KARO
    // =============================================
    const pendingDeletes = await PendingDelete.find({}).lean();

    if (pendingDeletes.length > 0) {
      console.log(`\n🗑️  \x1b[31mProcessing ${pendingDeletes.length} pending deletes...\x1b[0m`);

      for (const pd of pendingDeletes) {
        try {
          await atlasDb.collection(pd.collectionName).deleteOne({ _id: pd.documentId });
          await PendingDelete.findByIdAndDelete(pd._id);
        } catch (err) {
          console.log(`❌ Delete sync fail: ${pd.documentId} — ${err.message}`);
        }
      }

      console.log(`\x1b[32m✅ Pending deletes complete!\x1b[0m`);
    }

    // =============================================
    // STEP 2 — COUNT
    // =============================================
    let totalPending = 0;
    for (const modelName of modelNames) {
      if (modelName === "PendingDelete") continue;
      const Model = mongoose.model(modelName);
      try {
        const count = await Model.countDocuments({ syncedToAtlas: false });
        totalPending += count;
      } catch (err) {
        console.log(`⚠️  Count fail (${modelName}): ${err.message}`);
      }
    }

    if (totalPending === 0) {
      console.log("\x1b[32m✅ Sab data already synced hai — kuch pending nahi.\x1b[0m\n");
      return;
    }

    console.log(
      `\n\x1b[1m🔄 Syncing \x1b[33m${totalPending}\x1b[0m\x1b[1m pending records to Atlas...\x1b[0m`
    );

    const bar = createProgressBar(totalPending, "Records");
    let grandTotal = 0;
    let grandFailed = 0;
    let netLost = false; // ← global net lost flag

    // =============================================
    // STEP 3 — CURSOR BASED SYNC PER MODEL
    // =============================================
    for (const modelName of modelNames) {
      if (modelName === "PendingDelete") continue;

      if (!isAtlasOnline || !atlasClient) {
        netLost = true;
        break;
      }

      const Model = mongoose.model(modelName);
      const collectionName = Model.collection.name;

      let cursor;
      try {
        cursor = Model.find({ syncedToAtlas: false }).lean().cursor();
      } catch (err) {
        console.log(`⚠️  Cursor open fail (${collectionName}): ${err.message}`);
        continue;
      }

      let batch = [];
      let totalSynced = 0;
      let totalFailed = 0;
      let modelNetLost = false; // ← per-model net lost flag

      try {
        for await (const doc of cursor) {
          if (!isAtlasOnline || !atlasClient) {
            modelNetLost = true;
            netLost = true;
            break;
          }

          batch.push(doc);

          if (batch.length >= 500) {
            try {
              await pushBatchToAtlas(atlasDb, collectionName, batch);
              await Model.updateMany(
                { _id: { $in: batch.map((d) => d._id) } },
                { $set: { syncedToAtlas: true } }
              );
              bar.tick(batch.length);
              totalSynced += batch.length;
              grandTotal += batch.length;
            } catch (batchErr) {
              totalFailed += batch.length;
              grandFailed += batch.length;
              console.log(`\n❌ Batch fail (${collectionName}): ${batchErr.message}`);

              // ✅ Net gaya — foran band karo
              if (
                batchErr.message.includes("ENOTFOUND") ||
                batchErr.message.includes("ECONNREFUSED") ||
                batchErr.message.includes("ETIMEDOUT") ||
                batchErr.message.includes("connection")
              ) {
                isAtlasOnline = false;
                atlasClient = null;
                modelNetLost = true;
                netLost = true;
                console.log("📡 Net ya Atlas offline — sync band.");
                break;
              }
            }

            batch = [];
          }
        }
      } catch (cursorErr) {
        console.log(`\n❌ Cursor error (${collectionName}): ${cursorErr.message}`);
        modelNetLost = true;
        netLost = true;
      }

      // Remaining batch — sirf agar net nahi gaya
      if (batch.length > 0 && !modelNetLost) {
        try {
          await pushBatchToAtlas(atlasDb, collectionName, batch);
          await Model.updateMany(
            { _id: { $in: batch.map((d) => d._id) } },
            { $set: { syncedToAtlas: true } }
          );
          bar.tick(batch.length);
          totalSynced += batch.length;
          grandTotal += batch.length;
        } catch (batchErr) {
          totalFailed += batch.length;
          grandFailed += batch.length;
          console.log(`\n❌ Last batch fail (${collectionName}): ${batchErr.message}`);
        }
      }

      if (totalSynced > 0) {
        console.log(
          `  \x1b[32m↳ [SYNCED]\x1b[0m ${collectionName}: \x1b[33m${totalSynced}\x1b[0m records`
        );
      }
      if (totalFailed > 0) {
        console.log(
          `  \x1b[31m↳ [FAILED]\x1b[0m ${collectionName}: \x1b[31m${totalFailed}\x1b[0m records (next sync mein retry)`
        );
      }

      // ✅ Net lost — outer loop bhi band karo
      if (netLost) break;
    }

    // =============================================
    // STEP 4 — FINAL OUTPUT
    // =============================================

    // ✅ Net lost — bar complete mat karo, interrupted show karo
    if (netLost) {
      process.stdout.write("\n");
      console.log(
        `\n📡 \x1b[33mSync interrupted:\x1b[0m \x1b[32m${grandTotal}\x1b[0m synced, \x1b[31m${grandFailed}\x1b[0m failed — net wapas aane pe resume hoga.\n`
      );
      retryTimeout = setTimeout(connectToAtlasNative, 60000);
      return;
    }

    bar.complete();

    if (grandFailed > 0) {
      console.log(
        `\n☁️  \x1b[33m\x1b[1mSYNC PARTIAL:\x1b[0m \x1b[32m${grandTotal}\x1b[0m synced, \x1b[31m${grandFailed}\x1b[0m failed (retry hoga)\n`
      );
    } else {
      console.log(
        `\n☁️  \x1b[32m\x1b[1mSYNC COMPLETE:\x1b[0m \x1b[33m${grandTotal}\x1b[0m records Atlas par sync ho gaye!\n`
      );
    }

  } catch (err) {
    console.log("❌ Sync Error:", err.message);
  }
}


// =======================================================
// 🔁 RESTORE: ATLAS → LOCAL
// =======================================================
export async function restoreFromAtlasToLocal() {
  const atlasURI = process.env.MONGO_URI;
  const localURI = process.env.LOCAL_URI;

  const atlasClient = new MongoClient(atlasURI, { serverSelectionTimeoutMS: 5000 });
  const localClient = new MongoClient(localURI, { serverSelectionTimeoutMS: 5000 });

  try {
    await atlasClient.connect();
    await localClient.connect();

    const atlasDb = atlasClient.db();
    const localDb = localClient.db();

    const collections = await atlasDb.listCollections().toArray();
    let grandTotal = 0;

    console.log(`\n📦 ${collections.length} collections restore ho rahe hain...\n`);

    for (const col of collections) {
      const name = col.name;

      const meta = await localDb.collection("_system_meta").findOne({ 
        key: `restore_${name}` 
      });

      if (meta && meta.completed === true) {
        console.log(`  ⏭️  ${name}: already complete — skip karte hain`);
        continue;
      }

      const totalDocs = await atlasDb.collection(name).estimatedDocumentCount();
      if (totalDocs === 0) {
        await localDb.collection("_system_meta").updateOne(
          { key: `restore_${name}` },
          { $set: { key: `restore_${name}`, completed: true } },
          { upsert: true }
        );
        continue;
      }

      // ✅ FIX: Pichla resume point uthao (agar pehle se hai)
      const lastId = meta?.lastInsertedId || null;
      let alreadyDone = meta?.docsCompleted || 0;

      // ✅ FIX: _id se sorted query — resume point ke aage se shuru karo
      const query = lastId ? { _id: { $gt: lastId } } : {};
      const cursor = atlasDb.collection(name).find(query).sort({ _id: 1 });

      const bar = createProgressBar(totalDocs, name);
      bar.tick(alreadyDone); // ✅ pehle se hua hua progress dikhao

      let batch = [];
      let count = alreadyDone;
      let failed = 0;
      let lastDocId = lastId;

      try {
        for await (const doc of cursor) {
          batch.push({
            replaceOne: {
              filter: { _id: doc._id },
              replacement: { ...doc, syncedToAtlas: true },
              upsert: true,
            },
          });
          lastDocId = doc._id; // ✅ track karte raho last processed _id

          if (batch.length >= 500) {
            try {
              await localDb.collection(name).bulkWrite(batch);
              count += batch.length;
              grandTotal += batch.length;
              bar.tick(batch.length);

              // ✅ FIX: Har batch ke baad resume point SAVE karo
              await localDb.collection("_system_meta").updateOne(
                { key: `restore_${name}` },
                { $set: { 
                    key: `restore_${name}`, 
                    completed: false, 
                    lastInsertedId: lastDocId, 
                    docsCompleted: count 
                  } 
                },
                { upsert: true }
              );

            } catch (batchErr) {
              failed += batch.length;
              console.log(`❌ Restore batch fail (${name}): ${batchErr.message}`);
            }
            batch = [];
          }
        }

        if (batch.length > 0) {
          await localDb.collection(name).bulkWrite(batch);
          count += batch.length;
          grandTotal += batch.length;
          bar.tick(batch.length);

          await localDb.collection("_system_meta").updateOne(
            { key: `restore_${name}` },
            { $set: { 
                key: `restore_${name}`, 
                completed: false, 
                lastInsertedId: lastDocId, 
                docsCompleted: count 
              } 
            },
            { upsert: true }
          );
        }

        bar.complete();

        // ✅ Sab ho gaya — ab COMPLETE mark karo
        if (failed === 0) {
          await localDb.collection("_system_meta").updateOne(
            { key: `restore_${name}` },
            { $set: { 
                key: `restore_${name}`, 
                completed: true, 
                completedAt: new Date(),
                docsCompleted: count
              } 
            },
            { upsert: true }
          );
        } else {
          console.log(`  ⚠️  ${name}: ${failed} docs fail — dobara try hoga next run mein`);
        }

      } catch (netErr) {
        console.log(`\n📡 Net chala gaya (${name}) — ${count}/${totalDocs} ho chuke the. Resume hoga next run mein.\n`);
        bar.complete();
        throw netErr;
      }
    }

    console.log(`\n🎉 Total: ${grandTotal} docs local D: drive mein aa gaye.\n`);

    const allMeta = await localDb.collection("_system_meta")
      .find({ key: { $regex: "^restore_" } }).toArray();
    
    const allCompleted = collections.every(col => 
      allMeta.some(m => m.key === `restore_${col.name}` && m.completed === true)
    );

    if (allCompleted) {
      await localDb.collection("_system_meta").updateOne(
        { key: "restore_completed" },
        { $set: { key: "restore_completed", value: true, completedAt: new Date() } },
        { upsert: true }
      );
    }

  } catch (err) {
    console.error("❌ Restore Error:", err.message);
    throw err;
  } finally {
    await atlasClient.close();
    await localClient.close();
  }
}


// =======================================================
// 🗑️ DELETE AND SYNC HELPER
// =======================================================
export async function deleteAndSync(Model, id) {
  await Model.findByIdAndDelete(id);

  if (isProduction) return;

  await PendingDelete.create({
    collectionName: Model.collection.name,
    documentId: new mongoose.Types.ObjectId(id),
  });

  console.log(`📋 Pending delete save hua: ${id}`);
}


// =======================================================
// 🌐 EXPRESS APP
// =======================================================
const app = express();

// =======================================================
// 🛡 SECURITY LAYERS & MIDDLEWARES
// =======================================================
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        "img-src": ["'self'", "data:", "https:", "blob:"],
        "connect-src": [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

const originPermissions = isProduction
  ? {
      "https://hamzapaints.vercel.app": {
        default: ["GET"],
        routes: {
          "/auth/login":      ["POST"],
          "/auth/verify-otp": ["POST"],
          "/auth/logout-2fa": ["POST"],
        },
      },
    }
  : {
      "http://localhost:3000": {
        default: ["GET", "POST", "PUT", "DELETE"],
        routes: {},
      },
    };

const allowedOrigins = Object.keys(originPermissions);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && !allowedOrigins.includes(origin)) {
    return res
      .status(403)
      .json({ success: false, message: "❌ Forbidden: Origin not allowed" });
  }

  if (origin && originPermissions[origin]) {
    const { default: defaultMethods, routes } = originPermissions[origin];
    const allowedMethods = routes[req.path] ?? defaultMethods;

    if (!allowedMethods.includes(req.method)) {
      return res.status(403).json({
        success: false,
        message: `❌ Forbidden: ${req.method} not allowed for ${req.path}`,
      });
    }
  }

  return next();
});

app.set("trust proxy", isProduction);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 5 * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
    },
  })
);


// =======================================================
// EXPRESS ROUTES MOUNTING
// =======================================================
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/sales", saleRoutes);
app.use("/agents", agentRoutes);
app.use("/dynamic", dynamicRoutes);
app.use("/customers", customerRoutes);
app.use("/guest", guestRoutes);
app.use("/company", companyRoutes);

app.get("/", (req, res) => res.redirect("/auth/login"));


// =======================================================
// 📊 DASHBOARD & CALCULATOR ROUTE
// =======================================================
app.get("/home", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const role = req.user.role;
    let { filter = "month", from, to } = req.query;

    const PKT_TIMEZONE = "Asia/Karachi";
    const nowPKT = moment().tz(PKT_TIMEZONE);

    let startDate, endDate;

    if (filter === "today") {
      startDate = nowPKT.clone().startOf("day").toDate();
      endDate   = nowPKT.clone().endOf("day").toDate();
    } else if (filter === "yesterday") {
      startDate = nowPKT.clone().subtract(1, "days").startOf("day").toDate();
      endDate   = nowPKT.clone().subtract(1, "days").endOf("day").toDate();
    } else if (filter === "month") {
      startDate = nowPKT.clone().startOf("month").toDate();
      endDate   = nowPKT.clone().endOf("day").toDate();
    } else if (filter === "lastMonth") {
      startDate = nowPKT.clone().subtract(1, "month").startOf("month").toDate(); // 1 May 2026
      endDate   = nowPKT.clone().subtract(1, "month").endOf("month").toDate();   // 31 May 2026
    }else if (filter === "custom" && from) {
      startDate = moment.tz(from, PKT_TIMEZONE).startOf("day").toDate();
      endDate   = to
        ? moment.tz(to, PKT_TIMEZONE).endOf("day").toDate()
        : moment.tz(from, PKT_TIMEZONE).endOf("day").toDate();
    } else {
      startDate = new Date(0);
      endDate   = new Date();
    }

    const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

    const [
      salesAgg,
      refundSalesAgg,
      refundProductsAgg,
      customerItemsAgg,
      customerPaymentsAgg,
      agentPaymentsAgg,
      guestExpensesAgg,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalSalesStock: { $sum: { $multiply: ["$productRate", "$quantitySold"] } },
            totalSaleProfit: { $sum: "$profit" },
          },
        },
      ]),
      RefundSaleHistory.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalRefundStock:  { $sum: "$refundStock" },
            totalRefundProfit: { $sum: "$refundProfit" },
          },
        },
      ]),
      RefundProductHistory.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalCompanyRefund: { $sum: "$refundAmount" },
          },
        },
      ]),
      CustomerItem.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalOutstandingStock:  { $sum: "$originalStockValue" },
            totalOutstandingProfit: { $sum: "$originalProfitValue" },
          },
        },
      ]),
      CustomerPaymentHistory.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalPaidOutstandingStock:  { $sum: "$originalPaidStockValue" },
            totalPaidOutstandingProfit: { $sum: "$originalPaidProfitValue" },
          },
        },
      ]),
      AgentPaymentHistory.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalCommissionPaid: { $sum: "$amountPaid" },
          },
        },
      ]),
      // ✅ Guest Expenses — sirf amount ka sum
      Guest.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalGuestExpenses: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const s  = salesAgg[0]            || {};
    const rs = refundSalesAgg[0]      || {};
    const rp = refundProductsAgg[0]   || {};
    const ci = customerItemsAgg[0]    || {};
    const cp = customerPaymentsAgg[0] || {};
    const ap = agentPaymentsAgg[0]    || {};
    const ge = guestExpensesAgg[0]    || {};

    const stats = {
      totalSalesStock:            s.totalSalesStock             || 0,
      totalRefundStock:           rs.totalRefundStock           || 0,
      totalOutstandingStock:      ci.totalOutstandingStock      || 0,
      totalPaidOutstandingStock:  cp.totalPaidOutstandingStock  || 0,
      totalCompanyRefund:         rp.totalCompanyRefund         || 0,
      totalSaleProfit:            s.totalSaleProfit             || 0,
      totalRefundProfit:          rs.totalRefundProfit          || 0,
      totalOutstandingProfit:     ci.totalOutstandingProfit     || 0,
      totalPaidOutstandingProfit: cp.totalPaidOutstandingProfit || 0,
      totalCommissionPaid:        ap.totalCommissionPaid        || 0,
      totalGuestExpenses:         ge.totalGuestExpenses         || 0,
    };

    if (req.xhr) return res.render("partials/calculator-grid", { stats });
    res.render("home", { stats, role, filter, from, to });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/navi-bar", isLoggedIn, allowRoles("admin", "worker"), (req, res) => {
  const role = req.user.role;
  res.render("partials/navbar", { role });
});

app.use((req, res) => {
  res.status(404).send("❌ Page not found.");
});

app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.stack);
  res.status(500).send("Internal Server Error.");
});


// =======================================================
// 🚀 INITIALIZE SERVER
// =======================================================
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(
    `\n🚀 \x1b[32m\x1b[1mServer running on\x1b[0m ${
      isProduction
        ? "Vercel Production Mode"
        : "\x1b[36mhttp://localhost:" + PORT + "\x1b[0m"
    }\n`
  );

 if (!isProduction) {
  // ✅ Har 15 minute mein auto sync
  setInterval(async () => {
    if (!isAtlasOnline) {
      console.log("\n⏰ \x1b[90mAuto-Sync skip — Atlas offline hai.\x1b[0m");
      return;
    }
    console.log(
      "\n⏰ \x1b[33mAuto-Sync Timer:\x1b[0m Changed data cloud par sync ho raha hai..."
    );
    try {
      await syncMissingDataToAtlas();
    } catch (err) {
      console.log("❌ Timer Sync Error:", err.message);
    }
  }, 900000); // ✅ 15 min
}
});


export default app;





