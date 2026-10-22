import mongoose from "mongoose";

try {
    await mongoose.connect(
        "mongodb://127.0.0.1:27017/ashmaan_l3e_test",
        { serverSelectionTimeoutMS: 5000 }
    );

    const result = await mongoose.connection.db.admin().ping();

    console.log(
        "LOCAL_MONGODB_PING:",
        result.ok === 1 ? "PASS" : "FAIL"
    );
    console.log("TEST_DATABASE:", mongoose.connection.name);
} catch (error) {
    console.error("LOCAL_MONGODB_PING: FAIL");
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
