import mongoose from "mongoose";
import dotenv from "dotenv";
import { restoreFromAtlasToLocal } from "../app.js";
dotenv.config();

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("☁️  Atlas Cloud MongoDB Connected");
    return;
  }

  try {
    await mongoose.connect(process.env.LOCAL_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log("✅ Local MongoDB Connected (D: drive)");

    // ✅ Document count check NAHI — sirf restore_completed flag check
    const restoreFlag = await mongoose.connection.db
      .collection("_system_meta")
      .findOne({ key: "restore_completed" });

    if (restoreFlag && restoreFlag.value === true) {
      console.log("📦 Restore pehle complete ho chuka hai — D: drive se kaam shuru.");
    } else {
      console.log("⚠️  Restore incomplete ya pehli baar — Atlas se restore try ho raha hai...");

      // ✅ FIX: Apna alag try-catch — restore fail ho (internet na ho) to bhi
      // SERVER CRASH NA HO, local data se kaam chalta rahe
      try {
        await restoreFromAtlasToLocal();
        console.log("✅ Restore complete — ab local D: drive se kaam hoga.");
      } catch (restoreErr) {
        console.log("⚠️  Restore abhi nahi ho saka (internet issue ho sakta hai).");
        console.log("📡 Local data se kaam chalega — internet aane par auto-sync resume karega.");
        // ❌ process.exit YAHAN BILKUL NAHI — local MongoDB connected hai, server chalna chahiye!
      }
    }

  } catch (localErr) {
    // ✅ Ye sirf TAB chalega jab LOCAL MongoDB connect na ho (D: drive issue, service band, etc.)
    console.log("⚠️  Local MongoDB nahi mila — Atlas se restore ho raha hai...");
    try {
      await restoreFromAtlasToLocal();
      await mongoose.connect(process.env.LOCAL_URI);
      console.log("✅ Restore complete — ab local D: drive se kaam hoga.");
    } catch (atlasErr) {
      // ✅ Sirf yahan process.exit sahi hai — local bhi nahi chala, Atlas bhi nahi —
      // genuinely kuch nahi chal sakta, kyunki na local data hai na Atlas se mil saka
      console.error("❌ Local MongoDB bhi nahi mila, Atlas bhi fail:", atlasErr.message);
      console.error("🔴 Na local MongoDB chal raha hai na internet hai — app band karna padega.");
      process.exit(1);
    }
  }
};

export default connectDB;



