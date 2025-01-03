"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/components/ThemeContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // States for toggling sections (accordion)
  const [openSection, setOpenSection] = useState<string | null>(null);

  // For adding new voter
  const [voterEmail, setVoterEmail] = useState("");
  const [voterPassword, setVoterPassword] = useState("");
  const [voterPin, setVoterPin] = useState("");

  // For adding new candidate
  const [candidateName, setCandidateName] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<{ [key: string]: number }>({});

  // For blockchain data
  const [blockchainData, setBlockchainData] = useState<any[]>([]);

  // For results section
  const [resultMessage, setResultMessage] = useState("");

  const router = useRouter();
  const { theme } = useTheme();

  // Check if user is authenticated
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

  // Fetch candidates & votes, blockchain data
  useEffect(() => {
    const fetchCandidatesAndVotes = async () => {
      const candidatesSnapshot = await getDocs(collection(db, "candidates"));
      const candidateData = candidatesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCandidates(candidateData);

      const votesSnapshot = await getDocs(collection(db, "votes"));
      const voteCountsMap: { [key: string]: number } = {};

      votesSnapshot.docs.forEach((voteDoc) => {
        const candidateId = voteDoc.data().candidateId;
        if (candidateId) {
          voteCountsMap[candidateId] = (voteCountsMap[candidateId] || 0) + 1;
        }
      });

      setVoteCounts(voteCountsMap);
    };

    const fetchBlockchainData = async () => {
      try {
        const blockchainSnapshot = await getDocs(collection(db, "blockchain"));
        const allBlockchainData: any[] = [];

        blockchainSnapshot.forEach((doc) => {
          allBlockchainData.push({
            documentId: doc.id,
            chain: doc.data()?.chain || [],
          });
        });

        setBlockchainData(allBlockchainData);
      } catch (error) {
        console.error("Error fetching blockchain data", error);
      }
    };

    fetchCandidatesAndVotes();
    fetchBlockchainData();
  }, []);

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
        uid: userCredential.user.uid,
        email: voterEmail,
        pin:voterPin,
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

      setCandidates((prevCandidates) => [...prevCandidates, newCandidate]);
      setVoteCounts((prevVoteCounts) => ({
        ...prevVoteCounts,
        [newCandidate.id]: 0,
      }));
      setCandidateName("");
      alert("Candidate added successfully.");
    } catch (error) {
      console.error("Error adding candidate:", error);
      alert("Error adding candidate. Please try again.");
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteDoc(doc(db, "candidates", candidateId));
      setCandidates((prevCandidates) =>
        prevCandidates.filter((candidate) => candidate.id !== candidateId)
      );
      alert("Candidate deleted successfully.");
    } catch (error) {
      console.error("Error deleting candidate:", error);
      alert("Error deleting candidate. Please try again.");
    }
  };

  // Announce Results
  const handleAnnounceResults = () => {
    // Clear any previous result
    setResultMessage("");

    if (candidates.length === 0) {
      setResultMessage("No candidates available for results.");
      return;
    }

    // Find maximum vote count
    let maxVotes = 0;
    candidates.forEach((candidate) => {
      const votes = voteCounts[candidate.id] || 0;
      if (votes > maxVotes) {
        maxVotes = votes;
      }
    });

    // Gather all candidates who have that maxVotes
    const topCandidates = candidates.filter(
      (candidate) => (voteCounts[candidate.id] || 0) === maxVotes
    );

    // If only one candidate has the highest votes
    if (topCandidates.length === 1) {
      setResultMessage(
        `Winner: ${topCandidates[0].name} with ${maxVotes} vote(s).`
      );
    } else if (topCandidates.length > 1 && maxVotes > 0) {
      // Tie scenario among multiple candidates
      const tiedNames = topCandidates.map((c) => c.name).join(", ");
      setResultMessage(`It's a tie among: ${tiedNames} with ${maxVotes} vote(s).`);
    } else {
      // Edge case if all have 0 votes
      setResultMessage("No votes have been cast yet!");
    }
  };

  // If user is not authenticated, show nothing
  if (!isAuthenticated) {
    return null;
  }

  // Tailwind classes for theme
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

  // Toggle a section open/closed
  const toggleSection = (section: string) => {
    setOpenSection((prevSection) => (prevSection === section ? null : section));
  };

  // Helper to check if a section is open
  const isSectionOpen = (section: string) => openSection === section;

  return (
    <>
      <Navbar />
      <div className={`min-h-screen py-8 px-4 md:px-16 ${containerStyle}`}>
        <h1 className="text-4xl font-bold text-center text-indigo-500 mb-8">
          Admin Dashboard
        </h1>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Add Voter Credentials */}
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
                    type="pin"
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

          {/* Section 2: Manage Candidates */}
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

          {/* Section 3: Blockchain Data (full width on md+) */}
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
                  Explore the complete chain of blocks storing voting
                  transactions.
                </p>

                {blockchainData.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No blockchain data available.
                  </p>
                ) : (
                  blockchainData.map((document) => (
                    <div
                      key={document.documentId}
                      className="mb-6 overflow-x-auto"
                    >
                      <h3 className="text-md font-semibold mb-2 text-gray-300">
                        Document ID:{" "}
                        <span className="text-gray-200">
                          {document.documentId}
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {document.chain.map((block: any, index: number) => (
                          <div
                            key={index}
                            className="bg-gray-700 rounded-lg w-max p-4 text-sm text-gray-200"
                          >
                            <p>
                              <strong>Block #:</strong> {block.index}
                            </p>
                            <p>
                              <strong>Timestamp:</strong>{" "}
                              {new Date(block.timestamp).toLocaleString()}
                            </p>
                            <p>
                              <strong>Previous Hash:</strong>{" "}
                              {block.previousHash}
                            </p>
                            <p>
                              <strong>Hash:</strong> {block.hash}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 4: Results (full width on md+) */}
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
    </>
  );
};

export default AdminPage;
  