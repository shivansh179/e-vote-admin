import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Blockchain } from "./blockchain";

export const saveBlockchainToFirebase = async (blockchain: Blockchain) => {
  try {
    const serializedChain = blockchain.serializeChain();
    const blockchainRef = doc(db, "blockchain", "chainDocument");
    await setDoc(blockchainRef, { chain: serializedChain });
  } catch (error) {
    console.error("Error saving blockchain to Firebase:", error);
  }
};

export const loadBlockchainFromFirebase = async (blockchain: Blockchain) => {
  try {
    const blockchainRef = doc(db, "blockchain", "chainDocument");
    const docSnap = await getDoc(blockchainRef);

    if (docSnap.exists()) {
      const serializedChain = docSnap.data()?.chain || [];
      blockchain.loadChain(serializedChain);
      console.log("Blockchain loaded:", blockchain);
    }
  } catch (error) {
    console.error("Error loading blockchain from Firebase:", error);
  }
};
