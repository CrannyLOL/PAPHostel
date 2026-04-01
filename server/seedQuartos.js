import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync(new URL("./serviceAccountKey.json", import.meta.url), "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const quartos = [
  // Twin (4)
  { room_id: "Quarto Castelo Twin", tipo: "Twin", capacidade: 2, imagem: "QuartoCasteloTwin.png" },
  { room_id: "Quarto Cavacos Twin", tipo: "Twin", capacidade: 2, imagem: "QuartoCavacosTwin.png" },
  { room_id: "Quarto Manta Rota Twin", tipo: "Twin", capacidade: 2, imagem: "QuartoMantaRotaTwin.png" },
  { room_id: "Quarto Marinha Twin", tipo: "Twin", capacidade: 2, imagem: "QuartoMarinhaTwin.png" },
  // Duplo (5)
  { room_id: "Quarto Alvor Duplo", tipo: "Duplo", capacidade: 2, imagem: "QuartoAlvorDuplo.png" },
  { room_id: "Quarto Benagil Duplo", tipo: "Duplo", capacidade: 2, imagem: "QuartoBenagilDuplo.png" },
  { room_id: "Quarto Ilha da Fuseta Duplo", tipo: "Duplo", capacidade: 2, imagem: "QuartoIlhaFusetaDuplo.png" },
  { room_id: "Quarto Trafal Duplo", tipo: "Duplo", capacidade: 2, imagem: "QuartoTrafalDuplo.png" },
  { room_id: "Quarto Três Irmãos Duplo", tipo: "Duplo", capacidade: 2, imagem: "QuartoTresIrmaosDuplo.png" },
];

async function seed() {
  console.log("A limpar coleção 'quartos' existente...");

  const existing = await db.collection("quartos").get();
  const batch1 = db.batch();
  existing.docs.forEach(doc => batch1.delete(doc.ref));
  await batch1.commit();
  console.log(`  Removidos ${existing.size} documentos antigos.`);

  console.log("A inserir 9 quartos...");
  const batch2 = db.batch();
  quartos.forEach(q => {
    const ref = db.collection("quartos").doc();
    batch2.set(ref, q);
  });
  await batch2.commit();

  console.log("✅ 9 quartos inseridos com sucesso no Firebase!");
  console.log(quartos.map(q => `  - ${q.room_id} (${q.tipo})`).join("\n"));
  process.exit(0);
}

seed().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
