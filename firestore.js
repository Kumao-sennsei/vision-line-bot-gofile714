const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function saveWrongAnswer(userId, question, selected, correct) {
  const ref = db.collection("wrongAnswers").doc(userId);
  await ref.set({
    answers: admin.firestore.FieldValue.arrayUnion({
      question,
      selected,
      correct,
      timestamp: new Date()
    })
  }, { merge: true });
}

async function getWrongAnswers(userId) {
  const doc = await db.collection("wrongAnswers").doc(userId).get();
  return doc.exists ? doc.data().answers : [];
}

module.exports = { saveWrongAnswer, getWrongAnswers };
