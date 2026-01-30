const dns = require('dns');
const mongoose = require('mongoose');

// Force Google DNS to bypass local network blocking (ONLY in Development)
// Render/Production environments have their own working DNS
if (process.env.NODE_ENV !== 'production') {
    try {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        console.log("Only using Google DNS (8.8.8.8) for resolution.");
    } catch (e) {
        console.log("Could not set custom DNS servers:", e.message);
    }
}

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI || 'mongodb://localhost:27017/uni-pool';

        // Check if it's an SRV string (mongodb+srv://)
        // Check if it's an SRV string (mongodb+srv://)
        // Skip specialized resolution in Production (Render handles DNS correctly)
        if (uri.startsWith('mongodb+srv://') && process.env.NODE_ENV !== 'production') {
            console.log("Detected SRV connection string. Attempting to resolve shards manually to bypass network blocks...");

            try {
                // Parse the domain from the URI
                // Format: mongodb+srv://<user>:<password>@<domain>/<db>?<options>
                const parts = uri.split('@')[1].split('/')[0];
                const domain = parts;

                console.log(`Resolving SRV record for: _mongodb._tcp.${domain}`);

                const addresses = await new Promise((resolve, reject) => {
                    dns.resolveSrv(`_mongodb._tcp.${domain}`, (err, addresses) => {
                        if (err) reject(err);
                        else resolve(addresses);
                    });
                });

                if (addresses && addresses.length > 0) {
                    console.log(`Found ${addresses.length} shards via Google DNS.`);

                    // Construct standard connection string
                    // mongodb://user:pass@host1:port,host2:port,host3:port/db?ssl=true&replicaSet=atlas-xxxx-shard-0&authSource=admin&retryWrites=true&w=majority

                    const credentials = uri.split('//')[1].split('@')[0];
                    const dbName = uri.split('/')[3].split('?')[0];

                    const hostList = addresses.map(a => `${a.name}:${a.port}`).join(',');

                    // We also need the replica set name properly, usually can be found in TXT record or generic default
                    // But often just listing the hosts is enough for the driver to find the replica set.

                    // Important: Standard connection string requires ?ssl=true&authSource=admin
                    const standardUri = `mongodb://${credentials}@${hostList}/${dbName}?ssl=true&authSource=admin&retryWrites=true&w=majority`;

                    console.log("Generated Standard Connection String (hidden credentials). Connecting...");
                    uri = standardUri;
                }
            } catch (resolveErr) {
                console.warn("Manual DNS resolution failed, falling back to original URI. Error:", resolveErr.message);
            }
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            family: 4
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        console.log('Attemping to fallback to In-Memory Database (for testing/demo)...');

        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();
            await mongoose.connect(uri);
            console.log(`Fallback Connected: In-Memory MongoDB running at ${uri}`);
        } catch (fallbackErr) {
            console.error(`Fallback failed: ${fallbackErr.message}`);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
