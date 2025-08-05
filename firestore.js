const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  credential: cert({
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    project_id: process.env.FIREBASE_PROJECT_ID
  })
};

initializeApp(firebaseConfig);
const db = getFirestore();

async function saveWrongAnswer(userId, ...wrongAnswers) {
  const ref = db.collection('wrongAnswers').doc(userId);
  await ref.set({
    answers: wrongAnswers,
    timestamp: new Date()
  });
}

module.exports = { saveWrongAnswer };
