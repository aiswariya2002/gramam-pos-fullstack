// generate-cert.js
import fs from "fs";
import { execSync } from "child_process";
import { generateKeyPairSync } from "crypto";

try {
  // Create RSA private key
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  fs.writeFileSync("key.pem", privateKey.export({ type: "pkcs1", format: "pem" }));

  // Use Windows PowerShell to create a self-signed certificate
  console.log("⚙️  Creating Windows self-signed certificate...");
  execSync(
    'powershell -Command "New-SelfSignedCertificate -DnsName localhost -CertStoreLocation Cert:\\LocalMachine\\My"',
    { stdio: "inherit" }
  );

  // Just make a dummy cert.pem if PowerShell fails (fallback)
  if (!fs.existsSync("cert.pem")) {
    fs.writeFileSync(
      "cert.pem",
      `-----BEGIN CERTIFICATE-----\n${Buffer.from("LOCALTESTCERT").toString("base64")}\n-----END CERTIFICATE-----`
    );
  }

  console.log("✅ Dummy SSL key and certificate created successfully!");
} catch (err) {
  console.error("❌ Error creating cert:", err.message);
}
