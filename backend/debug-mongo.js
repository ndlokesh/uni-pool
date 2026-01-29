const dns = require('dns');
const mongoose = require('mongoose');
const http = require('http');

const uri = "mongodb+srv://ndlokesh14_db_user:3NuX008xMzYQOpjO@unipool.8v6vlzz.mongodb.net/uni-pool?appName=unipool";

console.log("--- DIAGNOSTIC START ---");

// 1. Check Public IP
http.get('http://api.ipify.org', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Current Public IP: ${data}`);
        checkDNS();
    });
}).on('error', (err) => {
    console.log("Could not fetch public IP:", err.message);
    checkDNS();
});

function checkDNS() {
    // 2. Check DNS Resolution
    const domain = "unipool.8v6vlzz.mongodb.net";
    console.log(`Resolving DNS for: _mongodb._tcp.${domain}`);
    dns.resolveSrv(`_mongodb._tcp.${domain}`, (err, addresses) => {
        if (err) {
            console.error("DNS Resolution FAILED:", err.code, err.message);
            // It might fail here.
        } else {
            console.log("DNS Resolution SUCCESS:", addresses);
        }
        testConnection();
    });
}

function testConnection() {
    // 3. Test Mongoose Connection
    console.log("Attempting Mongoose connect with family:4...");
    mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .then(() => {
            console.log("MONGOOSE CONNECTED SUCCESSFULLY!");
            process.exit(0);
        })
        .catch(err => {
            console.error("MONGOOSE DISTASTER:");
            console.error(err);
            process.exit(1);
        });
}
