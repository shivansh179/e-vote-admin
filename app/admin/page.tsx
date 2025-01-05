"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

// Firebase
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

// UI
import Navbar from "@/components/Navbar";
import { useTheme } from "@/components/ThemeContext";

// ------------------------------------
// 1) Define your Block & Blockchain classes
// ------------------------------------
import crypto from "crypto";

class Block {
  public index: number;
  public timestamp: string;
  public data: any;
  public previousHash: string;
  public hash: string;
  public nonce: number;

  constructor(
    index: number,
    timestamp: string,
    data: any,
    previousHash = "",
    nonce = 0
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }

  public calculateHash(): string {
    return crypto
      .createHash("sha256")
      .update(
        // this.index +
          this.previousHash
          // this.timestamp +
          // JSON.stringify(this.data)
          // this.nonce
      )
      .digest("hex");
  }
}

class Blockchain {
  public chain: Block[];

  constructor() {
    // Start with an empty chain
    this.chain = [];
  }

  /**
   * Adds a new block with the provided data.
   */
  public addBlock(data: any): void {
    const latestBlock = this.getLatestBlock();
    const newBlock = new Block(
      latestBlock ? latestBlock.index + 1 : 0,
      new Date().toISOString(),
      data,
      latestBlock ? latestBlock.hash : "0",
      0
    );
    this.chain.push(newBlock);
  }

  /**
   * Returns the latest block in the chain.
   * Returns null if the chain is empty.
   */
  public getLatestBlock(): Block | null {
    return this.chain.length > 0 ? this.chain[this.chain.length - 1] : null;
  }

  /**
   * Validates the chain's integrity.
   */
  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // if (currentBlock.hash !== currentBlock.calculateHash()) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }
}


// ------------------------------------
// 2) Create a global blockchain instance
//    and Firestore helpers
// ------------------------------------
const votingBlockchain = new Blockchain();

async function saveChainToFirestore(chain: Blockchain) {
  const chainCollection = collection(db, "debugChain"); // store in this collection
  for (const block of chain.chain) {
    const docRef = doc(chainCollection, block.index.toString());
    await setDoc(docRef, {
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce,
    });
  }
}

async function loadChainFromFirestore(chain: Blockchain) {
  const chainCollection = collection(db, "debugChain");
  const snapshot = await getDocs(chainCollection);

  if (snapshot.empty) {
    console.warn("No blocks found in Firestore (debugChain).");
    chain.chain = []; // Ensure chain remains empty
    return;
  }

  const loadedBlocks: Block[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const rebuiltBlock = new Block(
      data.index,
      data.timestamp,
      data.data,
      data.previousHash,
      data.nonce
    );
    rebuiltBlock.hash = data.hash; // Override computed hash with stored hash
    loadedBlocks.push(rebuiltBlock);
  });

  // Sort by index and overwrite chain
  loadedBlocks.sort((a, b) => a.index - b.index);
  chain.chain = loadedBlocks;
}


// ------------------------------------
// 3) AdminPage
// ------------------------------------
const AdminPage: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();

  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Accordion sections
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Voter fields
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState("");
  const [voterPassword, setVoterPassword] = useState("");
  const [voterPin, setVoterPin] = useState("");

  // Candidate fields
  const [candidateName, setCandidateName] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<{ [key: string]: number }>({});

  // Results
  const [resultMessage, setResultMessage] = useState("");

  // Blockchain states
  const [chainLoading, setChainLoading] = useState(false);
  const [chainValid, setChainValid] = useState<boolean | null>(null);

  // Extra: For block-adding example
  const [addingBlock, setAddingBlock] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const user = auth.currentUser;
      if (
        user &&
        (user.email === "prashansa.erica@gmail.com" ||
          user.email === "shivansh@gmail.com")
      ) {
        setIsAuthenticated(true);
      } else {
        router.push("/auth");
      }
    };
    checkAuthStatus();
  }, [router]);

  // Fetch candidates & votes
  useEffect(() => {
    const fetchCandidatesAndVotes = async () => {
      const candidatesSnap = await getDocs(collection(db, "candidates"));
      const candidateData = candidatesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCandidates(candidateData);

      const votesSnap = await getDocs(collection(db, "votes"));
      const counts: { [key: string]: number } = {};

      votesSnap.docs.forEach((voteDoc) => {
        const candidateId = voteDoc.data().candidateId;
        if (candidateId) {
          counts[candidateId] = (counts[candidateId] || 0) + 1;
        }
      });
      setVoteCounts(counts);
    };

    fetchCandidatesAndVotes();
  }, []);

  // Load chain if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadChain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Load chain & check
  const loadChain = async () => {
    setChainLoading(true);
    try {
      await loadChainFromFirestore(votingBlockchain);
      const valid = votingBlockchain.isChainValid();
      setChainValid(valid);
      if (!valid) {
        toast.error("Blockchain integrity check failed!");
      }
    } catch (error) {
      console.error("Error loading chain:", error);
      toast.error("Failed to load blockchain from Firestore.");
    } finally {
      setChainLoading(false);
    }
  };

  const handleRecheckChain = () => {
    const valid = votingBlockchain.isChainValid();
    setChainValid(valid);
    if (!valid) {
      toast.error("Blockchain is invalid!");
    } else {
      toast.success("Blockchain is valid!");
    }
  };

  const handleAddBlock = async () => {
    try {
      setAddingBlock(true);
      // Add a sample block (just a placeholder data)
      votingBlockchain.addBlock({ message: "New block from Admin", time: Date.now() });
      await saveChainToFirestore(votingBlockchain);
      const valid = votingBlockchain.isChainValid();
      setChainValid(valid);
      if (!valid) {
        toast.error("Blockchain integrity compromised after adding block!");
      } else {
        toast.success("Block added & chain is still valid!");
      }
    } catch (error) {
      console.error("Error adding block:", error);
      toast.error("Error adding block to chain.");
    } finally {
      setAddingBlock(false);
    }
  };

  // Add Voter
  const handleAddVoter = async () => {
    if (!voterEmail || !voterPassword) {
      alert("Please provide both email and password.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        voterEmail,
        voterPassword
      );
      await addDoc(collection(db, "users"), {
        name: voterName,
        uid: userCredential.user.uid,
        email: voterEmail,
        pin: voterPin,
        password: voterPassword,
        role: "voter",
      });
      setVoterEmail("");
      setVoterPassword("");
      setVoterPin("");
      alert("Voter credentials created successfully.");
    } catch (error) {
      console.error("Error creating voter credentials:", error);
      alert("Error creating voter credentials. Please try again.");
    }
  };

  // Add Candidate
  const handleAddCandidate = async () => {
    if (!candidateName.trim()) {
      alert("Please provide a valid candidate name.");
      return;
    }
    try {
      const newCandidateRef = await addDoc(collection(db, "candidates"), {
        name: candidateName,
      });
      const newCandidate = { id: newCandidateRef.id, name: candidateName };
      setCandidates((prev) => [...prev, newCandidate]);
      setVoteCounts((prev) => ({
        ...prev,
        [newCandidate.id]: 0,
      }));
      setCandidateName("");
      alert("Candidate added successfully.");
    } catch (error) {
      console.error("Error adding candidate:", error);
      alert("Error adding candidate. Please try again.");
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteDoc(doc(db, "candidates", candidateId));
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
      alert("Candidate deleted successfully.");
    } catch (error) {
      console.error("Error deleting candidate:", error);
      alert("Error deleting candidate. Please try again.");
    }
  };

  // Announce results
  const handleAnnounceResults = () => {
    setResultMessage("");
    if (candidates.length === 0) {
      setResultMessage("No candidates available for results.");
      return;
    }

    let maxVotes = 0;
    candidates.forEach((c) => {
      const votes = voteCounts[c.id] || 0;
      if (votes > maxVotes) {
        maxVotes = votes;
      }
    });

    const topCandidates = candidates.filter(
      (c) => (voteCounts[c.id] || 0) === maxVotes
    );
    if (topCandidates.length === 1 && maxVotes > 0) {
      setResultMessage(
        `Winner: ${topCandidates[0].name} with ${maxVotes} vote(s).`
      );
    } else if (topCandidates.length > 1 && maxVotes > 0) {
      const tied = topCandidates.map((tc) => tc.name).join(", ");
      setResultMessage(`It's a tie among: ${tied} with ${maxVotes} vote(s).`);
    } else {
      setResultMessage("No votes have been cast yet!");
    }
  };

  // Accordion helpers
  const isSectionOpen = (section: string) => openSection === section;
  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  if (!isAuthenticated) {
    return null;
  }

  // Theme-based tailwind classes
  const containerStyle =
    theme === "light"
      ? "bg-gray-50 text-gray-800"
      : "bg-gray-900 text-gray-100";
  const cardStyle =
    theme === "light"
      ? "bg-white shadow rounded-lg p-6"
      : "bg-gray-800 border border-gray-700 rounded-lg p-6";
  const inputStyle =
    theme === "light"
      ? "bg-gray-100 text-gray-900"
      : "bg-gray-700 text-gray-200";
  const buttonStyle =
    theme === "light"
      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
      : "bg-indigo-500 hover:bg-indigo-600 text-white";
  const headingStyle = "text-xl font-semibold";

  return (
    <>
      <Navbar />

      <div className={`min-h-screen py-8 px-4 md:px-16 ${containerStyle}`}>
        <h1 className="text-4xl font-bold text-center text-indigo-500 mb-8">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SECTION 1: Add Voter Credentials */}
          <div className={cardStyle}>
            <div
              onClick={() => toggleSection("voterCredentials")}
              className="flex items-center justify-between cursor-pointer"
            >
              <h2 className={`${headingStyle} text-indigo-400`}>
                Add Voter Credentials
              </h2>
              <span className="text-sm">
                {isSectionOpen("voterCredentials") ? "▲" : "▼"}
              </span>
            </div>
            {isSectionOpen("voterCredentials") && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Quickly create new voter credentials by providing an email and
                  password.
                </p>
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium">
                    Voter Name
                  </label>
                  <input
                    type="name"
                    placeholder="Enter voter name"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    className={`w-full p-3 rounded-md outline-none ${inputStyle}`}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium">
                    Voter Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter voter email"
                    value={voterEmail}
                    onChange={(e) => setVoterEmail(e.target.value)}
                    className={`w-full p-3 rounded-md outline-none ${inputStyle}`}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium">
                    Voter Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter voter password"
                    value={voterPassword}
                    onChange={(e) => setVoterPassword(e.target.value)}
                    className={`w-full p-3 rounded-md outline-none ${inputStyle}`}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium">
                    Voter Secret Pin
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Secret Pin"
                    value={voterPin}
                    onChange={(e) => setVoterPin(e.target.value)}
                    className={`w-full p-3 rounded-md outline-none ${inputStyle}`}
                  />
                </div>

                <button
                  onClick={handleAddVoter}
                  className={`w-full py-3 rounded-md font-semibold transition ${buttonStyle}`}
                >
                  Create Credentials
                </button>
                <div className="mt-4">
                  <Link href="/face_register">
                    <button
                      className={`w-full py-3 rounded-md font-semibold transition text-center ${buttonStyle}`}
                    >
                      Add Face ID
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Manage Candidates */}
          <div className={cardStyle}>
            <div
              onClick={() => toggleSection("manageCandidates")}
              className="flex items-center justify-between cursor-pointer"
            >
              <h2 className={`${headingStyle} text-indigo-400`}>
                Manage Candidates
              </h2>
              <span className="text-sm">
                {isSectionOpen("manageCandidates") ? "▲" : "▼"}
              </span>
            </div>
            {isSectionOpen("manageCandidates") && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Add and remove candidates, and track their vote counts.
                </p>
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter candidate name"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className={`w-full p-3 rounded-md outline-none ${inputStyle}`}
                  />
                </div>
                <button
                  onClick={handleAddCandidate}
                  className={`w-full py-3 rounded-md font-semibold transition ${buttonStyle} mb-4`}
                >
                  Add Candidate
                </button>

                <div className="mt-4 max-h-72 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No candidates added yet.
                    </p>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="py-2 text-sm font-medium">Name</th>
                          <th className="py-2 text-sm font-medium">Votes</th>
                          <th className="py-2 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((candidate) => (
                          <tr
                            key={candidate.id}
                            className="border-b border-gray-600"
                          >
                            <td className="py-2">{candidate.name}</td>
                            <td className="py-2">
                              {voteCounts[candidate.id] || 0}
                            </td>
                            <td className="py-2">
                              <button
                                onClick={() =>
                                  handleDeleteCandidate(candidate.id)
                                }
                                className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition text-sm"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Blockchain Data (full width on md+) */}
          <div className={`${cardStyle} md:col-span-2`}>
            <div
              onClick={() => toggleSection("blockchainData")}
              className="flex items-center justify-between cursor-pointer"
            >
              <h2 className={`${headingStyle} text-indigo-400`}>
                Blockchain Data
              </h2>
              <span className="text-sm">
                {isSectionOpen("blockchainData") ? "▲" : "▼"}
              </span>
            </div>
            {isSectionOpen("blockchainData") && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Show the loaded in-memory chain from Firestore, plus add or
                  re-check blocks.
                </p>

                {chainLoading && (
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Show chain validity */}
                <p className="mb-4">
                  Chain valid?{" "}
                  <strong
                    className={
                      chainValid === false
                        ? "text-red-400"
                        : chainValid === true
                        ? "text-green-400"
                        : ""
                    }
                  >
                    {chainValid === null
                      ? "Unknown"
                      : chainValid
                      ? "YES"
                      : "NO"}
                  </strong>
                </p>

                {/* Show all blocks */}
                {votingBlockchain.chain.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No blockchain data (chain is empty).
                  </p>
                ) : (
                  <div className="space-y-4">
                    {votingBlockchain.chain.map((block, index) => (
                      <div
                        key={index}
                        className="bg-gray-700 rounded-lg p-4 text-sm text-gray-200"
                      >
                        <p>
                          <strong>Block #:</strong> {block.index}
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {new Date(block.timestamp).toLocaleString()}
                        </p>
                        <p>
                          <strong>Previous Hash:</strong> {block.previousHash}
                        </p>
                        <p>
                          <strong>Hash:</strong> {block.hash}
                        </p>
                        <p>
                          <strong>Data:</strong> {JSON.stringify(block.data)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buttons: Reload, Re-check, Add Block */}
                <div className="mt-6 flex items-center space-x-2">
                  <button
                    onClick={loadChain}
                    disabled={chainLoading}
                    className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 transition"
                  >
                    Reload Chain
                  </button>
                  <button
                    onClick={handleRecheckChain}
                    disabled={chainLoading}
                    className="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 transition"
                  >
                    Re-check Validity
                  </button>
                  <button
                    onClick={handleAddBlock}
                    disabled={addingBlock || chainLoading}
                    className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition"
                  >
                    {addingBlock ? "Adding Block..." : "Add Block"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Results (full width on md+) */}
          <div className={`${cardStyle} md:col-span-2`}>
            <div
              onClick={() => toggleSection("results")}
              className="flex items-center justify-between cursor-pointer"
            >
              <h2 className={`${headingStyle} text-indigo-400`}>Results</h2>
              <span className="text-sm">
                {isSectionOpen("results") ? "▲" : "▼"}
              </span>
            </div>
            {isSectionOpen("results") && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Click the button below to calculate and announce the result
                  based on current vote counts.
                </p>
                <button
                  onClick={handleAnnounceResults}
                  className={`w-full py-3 rounded-md font-semibold transition ${buttonStyle} mb-4`}
                >
                  Announce Results
                </button>

                {resultMessage && (
                  <div className="mt-2 p-4 rounded bg-gray-700 text-white text-sm">
                    {resultMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster />
    </>
  );
};

export default AdminPage;
