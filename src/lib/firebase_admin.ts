// Import the Firebase Admin SDK
import * as admin from "firebase-admin";
import { OpenAILib } from "./openAI";

// Import your service account key JSON file
// Ensure the path is correct relative to this file
const serviceAccount = require("../../yoshunengloshproject-firebase-adminsdk-fbsvc-3a90b0a74d.json");

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Export the initialized admin objects
export default admin;

export async function getUserDocumentById(
  userId: string,
  option?: { showDebug: boolean }
): Promise<undefined | { [key: string]: any }> {
  try {
    // Get a reference to the Firestore database
    const db = admin.firestore();

    // Get a reference to the specific document in the 'user' collection
    const userDocRef = db.collection("user").doc(userId);

    // Fetch the document snapshot
    const userDoc = await userDocRef.get();

    // Check if the document exists and return its data
    if (userDoc.exists) {
      console.log(
        option?.showDebug
          ? `Document data for user ID ${userId}: ${userDoc.data()}`
          : `Document data for user ID ${userId} found`
      );
      return { ...userDoc.data(), id: userDoc.id };
      // return userDoc.data();
    } else {
      console.log(`No document found for user ID: ${userId}`);
      return undefined;
    }
  } catch (error) {
    console.error(`Error getting user document with ID ${userId}:`, error);
    throw undefined; // Re-throw the error for further handling
  }
}

export async function logInUser(userId: string) {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("user").doc(userId);

    await userDocRef.set({ isLoggedIn: true }, { merge: true });
    console.log(`Log in user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error logging in for user ID ${userId}:`, error);
    // throw error;
    return false;
  }
}

export async function logOutUser(userId: string) {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("user").doc(userId);

    await userDocRef.set(
      {
        isLoggedIn: false,
        threadId: admin.firestore.FieldValue.delete(),
        runId: admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );
    console.log(`Log out user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error logging out for user ID ${userId}:`, error);
    // throw error;
    return false;
  }
}

export async function linkStudentToParent({
  userId,
  userName,
  parentId,
}: {
  userId: string;
  userName: string;
  parentId: string;
}) {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("user").doc(parentId);

    // Get the current associated_students array (could be null)
    const userDoc = await userDocRef.get();
    let associated_students: Array<{ id: string; name: string }> = [];
    if (userDoc.exists) {
      const data = userDoc.data();
      if (Array.isArray(data?.associated_students)) {
        associated_students = data.associated_students;
      }
    }

    // Check if userId already exists
    const existingIndex = associated_students.findIndex(
      (student) => student.id === userId
    );
    if (existingIndex !== -1) {
      // Update the student's name if already linked
      if (associated_students[existingIndex].name !== userName) {
        associated_students[existingIndex].name = userName;
        await userDocRef.set({ associated_students }, { merge: true });
        console.log(
          `Updated name for student ${userId} linked to parent: ${parentId}`
        );
      } else {
        console.log(
          `Student ${userId} is already linked to parent: ${parentId}`
        );
      }
      return true;
    }

    // Add the new student
    associated_students.push({ id: userId, name: userName });

    await userDocRef.set({ associated_students }, { merge: true });
    console.log(`Link student ${userId} to parent: ${parentId}`);
    return true;
  } catch (error) {
    console.error(
      `Error Link student ${userId} to parent: ${parentId}:`,
      error
    );
    // throw error;
    return false;
  }
}

export async function setThreadOrRunId(
  userId: string,
  options: { threadId?: string; runId?: string }
) {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("user").doc(userId);

    // Only update the fields that are provided
    const updateData: { [key: string]: string } = {};
    if (options.threadId !== undefined) {
      updateData.threadId = options.threadId;
    }
    if (options.runId !== undefined) {
      updateData.runId = options.runId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No threadId or runId provided to update.");
    }

    await userDocRef.set(updateData, { merge: true });
    console.log(`Set fields for user ID ${userId}:`, updateData);
    return true;
  } catch (error) {
    console.error(
      `Error setting threadId or runId for user ID ${userId}:`,
      error
    );
    // throw error;
    return false;
  }
}

export async function deleteThreadOrRunId(
  userId: string,
  options: { threadId?: boolean; runId?: boolean }
) {
  try {
    const db = admin.firestore();
    const userDocRef = db.collection("user").doc(userId);

    // Build the update object based on options
    const updateData: { [key: string]: any } = {};
    if (options.threadId) {
      updateData.threadId = admin.firestore.FieldValue.delete();
    }
    if (options.runId) {
      updateData.runId = admin.firestore.FieldValue.delete();
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error(
        "No field specified to delete. Provide threadId and/or runId as true."
      );
    }

    // Use set with merge to avoid errors if fields do not exist
    await userDocRef.set(updateData, { merge: true });
    console.log(
      `Deleted fields for user ID ${userId}:`,
      Object.keys(updateData).join(", ")
    );
    return true;
  } catch (error) {
    console.error(
      `Error deleting threadId and/or runId for user ID ${userId}:`,
      error
    );
    // throw error;
    return false;
  }
}

export async function createChat(threadId: string, userId: string) {
  const db = admin.firestore();
  const chatDocRef = db.collection("chat").doc(threadId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  try {
    await chatDocRef.set({
      userId: userId,
      createdAt: now,
      data: [],
    });
    console.log(
      `Chat document created for threadId ${threadId} and userId ${userId}`
    );
    return true;
  } catch (error) {
    console.error(
      `Error creating chat document for threadId ${threadId}:`,
      error
    );
    return false;
  }
}

export async function insertConversationToChat(
  threadId: string,
  data: { role: "user" | "assistant"; text: string }
) {
  const db = admin.firestore();
  const chatDocRef = db.collection("chat").doc(threadId);

  try {
    await chatDocRef.update({
      data: admin.firestore.FieldValue.arrayUnion({
        role: data.role,
        text: data.text,
      }),
    });
    console.log(
      `Inserted conversation data to chat ${threadId}: role=${data.role}, text=${data.text}`
    );
    return true;
  } catch (error) {
    console.error(
      `Error inserting conversation data to chat ${threadId}:`,
      error
    );
    return false;
  }
}

export async function getChatDocumentById(
  threadId: string,
  option?: { showDebug: boolean }
): Promise<undefined | { [key: string]: any }> {
  try {
    // Get a reference to the Firestore database
    const db = admin.firestore();

    // Get a reference to the specific document in the 'user' collection
    const chatDocRef = db.collection("chat").doc(threadId);

    // Fetch the document snapshot
    const chatDoc = await chatDocRef.get();

    // Check if the document exists and return its data
    if (chatDoc.exists) {
      console.log(
        option?.showDebug
          ? `Document chat for threadId ${threadId}: ${chatDoc.data()}`
          : `Document chat for threadId ${threadId} found`
      );
      return { ...chatDoc.data(), id: chatDoc.id };
      // return chatDoc.data();
    } else {
      console.log(`No document found for chat ID: ${threadId}`);
      return undefined;
    }
  } catch (error) {
    console.error(`Error getting chat document with ID ${threadId}:`, error);
    throw undefined; // Re-throw the error for further handling
  }
}

export async function addSummaryToChat(
  threadId: string,
  summary: {
    text: string;
    json?: Awaited<ReturnType<typeof OpenAILib.getJsonSummary>>;
  }
) {
  try {
    const db = admin.firestore();
    const chatDocRef = db.collection("chat").doc(threadId);

    // Update the chat document with the summary field
    await chatDocRef.set(
      {
        summary: summary.text,
        summaryJson: summary.json ?? null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`Added summary to chat ${threadId}: ${summary}`);
    return true;
  } catch (error) {
    console.error(`Error adding summary to chat ${threadId}:`, error);
    return false;
  }
}

export async function getChatDocumentsByUserId(
  userId: string,
  option?: { limit?: number; showDebug: boolean }
) {
  try {
    const db = admin.firestore();
    const chatCollection = db.collection("chat");
    const querySnapshot = await chatCollection
      .where("userId", "==", userId)
      .where("summaryJson", "!=", null)
      .orderBy("updatedAt", "desc")
      .limit(option?.limit ?? 5)
      .get();

    const docs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (option?.showDebug) {
      console.log(
        `Fetched ${docs.length} chat documents for userId ${userId} with summaryJson not null`
      );
    }

    return docs;
  } catch (error) {
    console.error(
      `Error getting chat documents for userId ${userId} with summaryJson not null:`,
      error
    );
    return [];
  }
}

export async function completeSurvey({
  userId,
  entry,
}: {
  userId: string;
  entry: {
    name: string; // "profile" | "formal_scale_sections" | others
    path: string; // Storage object path
    downloadUrl: string;
    submittedAt: string; // ISO timestamp
  };
}): Promise<void> {
  const db = admin.firestore();
  const userRef = db.collection("user").doc(userId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);

    // Get current array (or initialize)
    const current =
      snap.exists && Array.isArray(snap.get("completedSurveys"))
        ? (snap.get("completedSurveys") as any[])
        : [];

    // Replace by name
    const updated = [
      ...current.filter((e) => e && e.name !== entry.name),
      entry,
    ];

    // Merge so we don't clobber other fields in the user doc
    tx.set(userRef, { completedSurveys: updated }, { merge: true });
  });
}

export async function completeVideoCourse({
  userId,
  entry,
}: {
  userId: string;
  entry: {
    name: string; // "profile" | "formal_scale_sections" | others
    submittedAt?: string; // ISO timestamp
  };
}): Promise<void> {
  const db = admin.firestore();
  const userRef = db.collection("user").doc(userId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);

    // Get current array (or initialize)
    const current =
      snap.exists && Array.isArray(snap.get("completedVideos"))
        ? (snap.get("completedVideos") as any[])
        : [];

    // Replace by name
    const newEntry = entry.submittedAt ? entry : { name: entry.name };
    const updated = [
      ...current.filter((e) => e && e.name !== entry.name),
      newEntry,
    ];

    // Merge so we don't clobber other fields in the user doc
    tx.set(userRef, { completedVideos: updated }, { merge: true });
  });
}
